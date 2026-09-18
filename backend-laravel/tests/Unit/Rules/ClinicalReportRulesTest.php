<?php

namespace TestsUnitRules;

use AppRulesServicesClinicalReportRules;
use PHPUnitFrameworkTestCase;

class ClinicalReportRulesTest extends TestCase
{
    protected ClinicalReportRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new ClinicalReportRules();
    }

    public function test_report_intake_supported_formats(): void
    {
        $pdf = $this->rules->evaluate('REPORT_INTAKE_REQUEST', ['mime_type' => 'application/pdf'], []);
        $this->assertTrue($pdf->allowed);
        $this->assertEquals('INTAKE-002', $pdf->reason);

        $exe = $this->rules->evaluate('REPORT_INTAKE_REQUEST', ['mime_type' => 'application/x-msdownload'], []);
        $this->assertFalse($exe->allowed);
        $this->assertEquals('INTAKE-001', $exe->reason);
    }

    public function test_report_confirmation_decisions(): void
    {
        $confirm = $this->rules->evaluate('REPORT_CONFIRM_REQUEST', ['status' => 'confirmed'], []);
        $this->assertTrue($confirm->allowed);

        $edit = $this->rules->evaluate('REPORT_CONFIRM_REQUEST', ['status' => 'edited'], []);
        $this->assertTrue($edit->allowed);

        $ignore = $this->rules->evaluate('REPORT_CONFIRM_REQUEST', ['status' => 'ignored'], []);
        $this->assertTrue($ignore->allowed);

        $invalid = $this->rules->evaluate('REPORT_CONFIRM_REQUEST', ['status' => 'delete_all'], []);
        $this->assertFalse($invalid->allowed);
        $this->assertEquals('INTAKE-003', $invalid->reason);
    }

    public function test_ai_analysis_fallback_when_api_key_absent(): void
    {
        config(['services.openai.api_key' => null]);
        putenv('OPENAI_API_KEY=');

        $decision = $this->rules->evaluate('AI_REPORT_ANALYSIS_REQUEST', ['text' => 'Patient has mild forgetfulness.'], []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('AI-002', $decision->reason);
        $this->assertEquals('use_deterministic_fallback', $decision->action);
        $this->assertEquals('AI report analysis is not configured.', $decision->metadata['message']);
    }

    public function test_plain_language_explanation_rule(): void
    {
        $decision = $this->rules->evaluate('REPORT_EXPLAIN_REQUEST', [], []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('EXPL-001', $decision->reason);
        $this->assertEquals('Grade 6', $decision->metadata['target_reading_level']);
    }

    public function test_doctor_question_generator_rule(): void
    {
        $decision = $this->rules->evaluate('DOCTOR_QUESTION_REQUEST', [], []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('DOCQ-001', $decision->reason);
        $this->assertEquals('actionable_checklist', $decision->metadata['format']);
    }

    public function test_missing_info_zero_hallucination_rule(): void
    {
        $absent = $this->rules->evaluate('MISSING_INFO_CHECK', ['value' => null], []);
        $this->assertTrue($absent->allowed);
        $this->assertEquals('MISS-001', $absent->reason);
        $this->assertEquals('Not provided in report', $absent->metadata['label']);
    }
}
