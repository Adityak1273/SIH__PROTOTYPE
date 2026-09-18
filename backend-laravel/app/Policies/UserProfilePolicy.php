<?php

namespace App\Policies;

use App\Models\CaregiverPatientLink;
use App\Models\User;
use App\Models\UserProfile;

class UserProfilePolicy
{
    /**
     * Determine if a user can view a profile.
     * - Patient: Own profile only (cross-patient access strictly prohibited).
     * - Caregiver / Health Worker: Only if actively linked to the patient.
     * - Admin: Denied personal profile medical data by default.
     */
    public function view(User $user, UserProfile $profile): bool
    {
        if ($user->isPatient()) {
            return $user->id === $profile->user_id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isCaregiver() || $user->isHealthWorker()) {
            return CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $profile->user_id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }

    /**
     * Determine if a user can manage profile settings.
     * ONLY the patient can manage their own personal settings (companion name, language, etc.).
     * Caregivers, Health Workers, and Admins CANNOT modify patient settings directly.
     */
    public function update(User $user, UserProfile $profile): bool
    {
        if ($user->isPatient()) {
            return $user->id === $profile->user_id;
        }

        return false;
    }
}
