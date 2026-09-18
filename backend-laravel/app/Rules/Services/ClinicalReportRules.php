<?php

namespace AppRulesServices;

use AppRulesContractsRuleInterface;
use AppRulesEngineRuleDecision;

class ClinicalReportRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'REPORT_INTAKE_REQUEST',
        'REPORT_CONFIRM_REQUEST',
        'AI_REPORT_ANALYSIS_REQUEST',
        'REPORT_EXPLAIN_REQUEST',
        'DOCTOR_QUESTION_REQUEST',
        'MISSING_INFO_CHECK',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'REPORT_INTAKE_REQUEST':
                $mime = $payload['mime_type'] ?? 'text/plain';
                $allowed = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg'];

                if (!in_array($mime, $allowed, true)) {
                    return RuleDecision::deny(
                        'unsupported_format',
                        'INTAKE-001',
                        [],
                        ['reason' => 'Allowed formats: PDF, Text, PNG, JPG.', 'rule' => 'INTAKE-001']
                    );
                }

                // Rule INTAKE-002: Staged candidate data requires confirmation
                return RuleDecision::allow(
                    'stage_candidates',
                    'INTAKE-002',
                    [],
                    [
                        'requires_confirmation' => true,
                        'disclaimer' => 'Extracted items are candidates and require patient/caregiver confirmation.',
                        'rule' => 'INTAKE-002',
                    ]
                );

            case 'REPORT_CONFIRM_REQUEST':
                $status = $payload['status'] ?? '';
                if (!in_array($status, ['confirmed', 'edited', 'ignored'], true)) {
                    return RuleDecision::deny(
                        'invalid_decision',
                        'INTAKE-003',
                        [],
                        ['reason' => 'Decision must be confirmed, edited, or ignored.', 'rule' => 'INTAKE-003']
                    );
                }

                return RuleDecision::allow('apply_decision', 'INTAKE-003');

            case 'AI_REPORT_ANALYSIS_REQUEST':
                $hasApiKey = !empty(config('services.openai.api_key', env('OPENAI_API_KEY')));

                // Rule AI-002: Safe fallback if API key absent
                if (!$hasApiKey) {
                    return RuleDecision::allow(
                        'use_deterministic_fallback',
                        'AI-002',
                        [],
                        [
                            'status' => 'fallback',
                            'message' => 'AI report analysis is not configured.',
                            'rule' => 'AI-002',
                        ]
                    );
                }

                // Rule AI-003: Non-diagnostic guardrail
                $text = mb_strtolower($payload['text'] ?? '');
                if (preg_match('/\b(dementia|alzheimer|clinical stage [1-7]|severe cognitive deficit)\b/i', $text)) {
                    return RuleDecision::allow(
                        'sanitize_diagnostic_claims',
                        'AI-003',
                        [],
                        [
                            'notice' => 'Report analysis describes observations only and does not establish a diagnosis of dementia.',
                            'rule' => 'AI-003',
                        ]
                    );
                }

                return RuleDecision::allow('execute_ai_analysis', 'AI-001');

            case 'REPORT_EXPLAIN_REQUEST':
                // Rule EXPL-001: Plain-language translation at 6th-grade reading level
                return RuleDecision::allow(
                    'explain_in_plain_language',
                    'EXPL-001',
                    [],
                    [
                        'target_reading_level' => 'Grade 6',
                        'tone' => 'reassuring, clear, non-alarmist',
                        'rule' => 'EXPL-001',
                    ]
                );

            case 'DOCTOR_QUESTION_REQUEST':
                // Rule DOCQ-001: Questions must derive only from verified facts
                return RuleDecision::allow(
                    'generate_fact_based_questions',
                    'DOCQ-001',
                    [],
                    [
                        'format' => 'actionable_checklist',
                        'extrapolation_forbidden' => true,
                        'rule' => 'DOCQ-001',
                    ]
                );

            case 'MISSING_INFO_CHECK':
                // Rule MISS-001: Zero hallucination for absent fields
                $fieldValue = $payload['value'] ?? null;
                if (empty($fieldValue)) {
                    return RuleDecision::allow(
                        'mark_not_provided',
                        'MISS-001',
                        [],
                        [
                            'label' => 'Not provided in report',
                            'rule' => 'MISS-001',
                        ]
                    );
                }
                return RuleDecision::allow('field_present', 'MISS-001');

            default:
                return RuleDecision::deny('unsupported_event', 'CLIN_UNSUPPORTED');
        }
    }
}
