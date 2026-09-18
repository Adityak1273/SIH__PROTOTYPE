<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class CaregiverRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'CAREGIVER_ACCESS_PATIENT',
        'CAREGIVER_MODIFY_REMINDER',
        'CAREGIVER_VIEW_REPORT',
        'CAREGIVER_LINK_REQUEST',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        $linkStatus = $payload['link_status'] ?? 'pending';

        switch ($event) {
            case 'CAREGIVER_ACCESS_PATIENT':
                if ($linkStatus !== 'active') {
                    return RuleDecision::deny(
                        'block_patient_access',
                        'CAREGIVER_PATIENT_LINK_NOT_ACTIVE',
                        [],
                        ['status' => $linkStatus]
                    );
                }

                return RuleDecision::allow(
                    'grant_patient_view',
                    'LINK_ACTIVE_ACCESS_GRANTED'
                );

            case 'CAREGIVER_MODIFY_REMINDER':
                if ($linkStatus !== 'active') {
                    return RuleDecision::deny('block_action', 'LINK_NOT_ACTIVE');
                }

                $canManage = (bool) ($payload['permissions']['can_manage_reminders'] ?? true);
                if (!$canManage) {
                    return RuleDecision::deny(
                        'block_reminder_modification',
                        'REMINDER_MANAGEMENT_PERMISSION_DENIED'
                    );
                }

                return RuleDecision::allow('allow_reminder_modification', 'PERMISSION_GRANTED');

            case 'CAREGIVER_VIEW_REPORT':
                if ($linkStatus !== 'active') {
                    return RuleDecision::deny('block_action', 'LINK_NOT_ACTIVE');
                }

                $canViewReports = (bool) ($payload['permissions']['view_clinical_reports'] ?? false);
                if (!$canViewReports) {
                    return RuleDecision::deny(
                        'block_clinical_report_view',
                        'CLINICAL_REPORT_ACCESS_PERMISSION_DENIED'
                    );
                }

                return RuleDecision::allow('allow_report_view', 'REPORT_ACCESS_PERMITTED');

            case 'CAREGIVER_LINK_REQUEST':
                $patientCount = (int) ($payload['active_patient_count'] ?? 0);
                if ($patientCount >= 10 && ($payload['caregiver_role'] ?? '') !== 'health_worker') {
                    return RuleDecision::deny(
                        'reject_link_request',
                        'INDIVIDUAL_CAREGIVER_PATIENT_LIMIT_REACHED',
                        [],
                        ['limit' => 10]
                    );
                }

                return RuleDecision::allow('create_link_invitation', 'LINK_REQUEST_PERMITTED');

            default:
                return RuleDecision::allow('observe');
        }
    }
}
