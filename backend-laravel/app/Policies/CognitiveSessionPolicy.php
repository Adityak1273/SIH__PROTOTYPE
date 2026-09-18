<?php

namespace App\Policies;

use App\Models\CaregiverPatientLink;
use App\Models\CognitiveSession;
use App\Models\User;

class CognitiveSessionPolicy
{
    /**
     * Determine if a user can view a cognitive session.
     * - Patient: Own sessions only (cross-patient strictly denied).
     * - Caregiver: Actively linked patients with progress viewing permission only.
     * - Health Worker: Actively linked patients with authorized clinical reporting permission.
     * - Admin: Strictly DENIED unrestricted medical-data access by default.
     */
    public function view(User $user, CognitiveSession $session): bool
    {
        // 1. Patient viewing own session
        if ($user->isPatient()) {
            return $user->id === $session->user_id;
        }

        // 2. Admin explicitly denied unrestricted access to patient cognitive session data
        if ($user->isAdmin()) {
            return false;
        }

        // 3. Caregiver viewing linked patient session
        if ($user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $session->user_id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canViewProgress() ?? false);
        }

        // 4. Health Worker viewing explicitly authorized patient session
        if ($user->isHealthWorker()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $session->user_id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canViewClinicalReports() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can create/complete games.
     * ONLY patients can complete games. Caregivers, Health Workers, and Admins cannot.
     */
    public function create(User $user): bool
    {
        return $user->isPatient();
    }
}
