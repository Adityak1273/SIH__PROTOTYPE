<?php

namespace App\Policies;

use App\Models\CaregiverPatientLink;
use App\Models\ClinicalReport;
use App\Models\User;

class ClinicalReportPolicy
{
    /**
     * Determine if a user can view a clinical report.
     * - Patient: Own reports only.
     * - Health Worker: Actively linked with explicit 'view_clinical_reports' permission.
     * - Caregiver: Actively linked with explicit 'view_clinical_reports' permission.
     * - Admin: Denied by default (no unrestricted medical data access).
     */
    public function view(User $user, ClinicalReport $report): bool
    {
        if ($user->isPatient()) {
            return $user->id === $report->user_id;
        }

        if ($user->isAdmin()) {
            return false;
        }

        if ($user->isHealthWorker() || $user->isCaregiver()) {
            $link = CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $report->user_id)
                ->where('status', 'active')
                ->first();

            return (bool) ($link?->canViewClinicalReports() ?? false);
        }

        return false;
    }

    /**
     * Determine if a user can create/analyze clinical reports.
     * Only authorized Health Workers can create clinical reports.
     */
    public function create(User $user): bool
    {
        return $user->isHealthWorker();
    }
}
