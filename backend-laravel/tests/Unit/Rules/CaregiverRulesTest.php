<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\CaregiverRules;
use PHPUnit\Framework\TestCase;

class CaregiverRulesTest extends TestCase
{
    protected CaregiverRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new CaregiverRules();
    }

    public function test_caregiver_access_blocked_if_link_is_not_active(): void
    {
        $payload = ['link_status' => 'pending'];
        $decision = $this->rules->evaluate('CAREGIVER_ACCESS_PATIENT', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('block_patient_access', $decision->action);
        $this->assertEquals('CAREGIVER_PATIENT_LINK_NOT_ACTIVE', $decision->reason);
    }

    public function test_caregiver_access_granted_if_link_is_active(): void
    {
        $payload = ['link_status' => 'active'];
        $decision = $this->rules->evaluate('CAREGIVER_ACCESS_PATIENT', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('grant_patient_view', $decision->action);
    }

    public function test_reminder_modification_blocked_if_permission_not_granted(): void
    {
        $payload = [
            'link_status' => 'active',
            'permissions' => ['can_manage_reminders' => false],
        ];

        $decision = $this->rules->evaluate('CAREGIVER_MODIFY_REMINDER', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('block_reminder_modification', $decision->action);
        $this->assertEquals('REMINDER_MANAGEMENT_PERMISSION_DENIED', $decision->reason);
    }

    public function test_clinical_report_access_blocked_if_permission_not_granted(): void
    {
        $payload = [
            'link_status' => 'active',
            'permissions' => ['view_clinical_reports' => false],
        ];

        $decision = $this->rules->evaluate('CAREGIVER_VIEW_REPORT', $payload, []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('block_clinical_report_view', $decision->action);
    }
}
