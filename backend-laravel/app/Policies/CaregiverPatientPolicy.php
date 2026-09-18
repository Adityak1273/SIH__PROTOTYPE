<?php

namespace App\Policies;

use App\Models\CaregiverPatientLink;
use App\Models\User;

class CaregiverPatientPolicy
{
    /**
     * Determine if a user can view a patient's caregiver overview.
     * - Patient: Own self only (cross-patient access strictly prohibited).
     * - Caregiver / Health Worker: Only if an active link exists.
     * - Admin: Denied unrestricted medical-data access by default.
     */
    public function view(User $user, User $patient): bool
    {
        if ($user->isPatient()) {
            return $user->id === $patient->id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver() || $user->isHealthWorker()) {
            return CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }

    /**
     * Determine if a user can view permitted progress (trends and game breakdown).
     */
    public function viewProgress(User $user, User $patient): bool
    {
        if ($user->isPatient()) {
            return $user->id === $patient->id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canViewProgress() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can manage reminders for a patient.
     */
    public function manageReminders(User $user, User $patient): bool
    {
        if ($user->isPatient()) {
            return $user->id === $patient->id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canManageReminders() ?? false);
        }

        return false;
    }

    /**
     * Determine if a caregiver can receive alerts for a patient.
     */
    public function receiveAlerts(User $user, User $patient): bool
    {
        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canReceiveAlerts() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can view clinical reports for a patient.
     * Requires explicit authorization on the link.
     */
    public function viewClinicalReports(User $user, User $patient): bool
    {
        if ($user->isPatient()) {
            return $user->id === $patient->id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver() || $user->isHealthWorker()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canViewClinicalReports() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can create observation notes for a patient.
     */
    public function createNote(User $user, User $patient): bool
    {
        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver() || $user->isHealthWorker()) {
            return CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }

    /**
     * Determine if a user can export reports for a patient.
     */
    public function exportReport(User $user, User $patient): bool
    {
        if ($user->isPatient()) {
            return $user->id === $patient->id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver()) {
            return CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }
}
