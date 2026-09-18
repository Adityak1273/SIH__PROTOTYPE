<?php

namespace App\Policies;

use App\Models\CaregiverPatientLink;
use App\Models\Reminder;
use App\Models\User;

class ReminderPolicy
{
    /**
     * Determine if a user can view a reminder.
     * - Patient: Own reminders only (cross-patient strictly denied).
     * - Caregiver: Actively linked patient's reminders only.
     * - Admin: Denied by default.
     */
    public function view(User $user, Reminder $reminder): bool
    {
        if ($user->isPatient()) {
            return $user->id === $reminder->user_id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver()) {
            return CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $reminder->user_id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }

    /**
     * Determine if a user can create a reminder.
     * - Patient: Always permitted for self.
     * - Caregiver: Permitted only for actively linked patient with 'can_manage_reminders' permission.
     * - Admin / Health Worker: Denied.
     */
    public function create(User $user, ?User $patient = null): bool
    {
        if ($user->isPatient()) {
            return $patient === null || $user->id === $patient->id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver() && $patient) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $patient->id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canManageReminders() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can update a reminder.
     * - Patient: Own reminders only.
     * - Caregiver: Actively linked patient only with 'can_manage_reminders' permission.
     * - Admin: Denied.
     */
    public function update(User $user, Reminder $reminder): bool
    {
        if ($user->isPatient()) {
            return $user->id === $reminder->user_id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $reminder->user_id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canManageReminders() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can delete a reminder.
     */
    public function delete(User $user, Reminder $reminder): bool
    {
        return $this->update($user, $reminder);
    }
}
