<?php

namespace App\Policies;

use App\Models\CaregiverAlert;
use App\Models\CaregiverPatientLink;
use App\Models\User;

class CaregiverAlertPolicy
{
    /**
     * Determine if a user can view a caregiver alert.
     * - Patient: Alerts for themselves only.
     * - Caregiver: Assigned caregiver or actively linked caregiver with 'can_receive_alerts' permission.
     * - Health Worker: Actively linked with 'can_receive_alerts' permission.
     * - Admin: Denied by default.
     */
    public function view(User $user, CaregiverAlert $alert): bool
    {
        if ($user->isPatient()) {
            return $user->id === $alert->patient_id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->id === $alert->caregiver_id) {
            return true;
        }

        if ($user->isCaregiver() || $user->isHealthWorker()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $alert->patient_id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canReceiveAlerts() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can acknowledge an alert.
     */
    public function acknowledge(User $user, CaregiverAlert $alert): bool
    {
        if ($user->isAdmin()) {
            return false;
        }

        if ($user->id === $alert->caregiver_id) {
            return true;
        }

        if ($user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $alert->patient_id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canReceiveAlerts() ?? false);
        }

        return false;
    }
}
