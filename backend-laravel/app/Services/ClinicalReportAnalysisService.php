<?php

namespace AppServices;

use AppModelsClinicalReport;
use AppModelsUser;
use IlluminateSupportFacadesHttp;
use IlluminateSupportFacadesLog;

class ClinicalReportAnalysisService
{
    protected const NON_DIAGNOSTIC_DISCLAIMER = 'These explanations and questions are designed to assist older adults and their caregivers in discussions with healthcare providers. They do not constitute a medical diagnosis of dementia or cognitive impairment.';

    public function __construct(
        protected ClinicalIntelligenceService $clinicalService
    ) {}

    /**
     * Check whether OpenAI API key is configured.
     */
    public function isAiConfigured(): bool
    {
        $key = config('services.openai.api_key') ?: env('OPENAI_API_KEY');
        return !empty($key) && is_string($key) && strlen(trim($key)) > 10;
    }

    /**
     * Analyzes clinical text with OpenAI if configured; otherwise gracefully returns deterministic fallback.
     */
    public function analyze(string $reportText, ?User $patient = null): array
    {
        $text = trim($reportText);
        $deterministic = $this->clinicalService->analyzeText($text);
        $entities = $this->clinicalService->extractEntities($text);

        if (!$this->isAiConfigured()) {
            return [
                'status' => 'fallback',
                'ai_configured' => false,
                'message' => 'AI report analysis is not configured.',
                'plain_language_summary' => $this->generateDeterministicExplanation($text, $entities),
                'key_findings' => $this->formatFindings($deterministic, $entities),
                'doctor_questions' => $this->generateDeterministicQuestions($entities),
                'missing_information' => $this->detectMissingInfo($entities, $deterministic),
                'clinical_disclaimer' => self::NON_DIAGNOSTIC_DISCLAIMER,
                'deterministic_analysis' => $deterministic,
            ];
        }

        try {
            $response = Http::withToken(config('services.openai.api_key') ?: env('OPENAI_API_KEY'))
                ->timeout(12)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => <<<SYSTEM
You are an expert, compassionate clinical report reader for older adults and family caregivers in Northeast India.
RULES:
1. NEVER diagnose dementia, Alzheimer's, or predict cognitive decline.
2. NEVER prescribe treatments or contradict clinician orders.
3. Translate medical jargon into clear, reassuring language at a 6th-grade reading level.
4. ONLY reference facts explicitly stated in the document. For missing items, specify "Not provided in report".
5. Return strictly valid JSON with keys:
   - "plain_language_summary": 2-3 short, reassuring sentences explaining what this document covers.
   - "key_findings": array of objects with "item", "explanation", "source_text".
   - "doctor_questions": array of 3-5 clear questions formatted as a checklist for the patient's next visit.
   - "missing_information": array of routine health indicators not found in the report (e.g. blood pressure, next visit date).
SYSTEM
                        ],
                        [
                            'role' => 'user',
                            'content' => "Please analyze this clinical document for a patient and family caregiver:\n\n" . mb_substr($text, 0, 8000),
                        ],
                    ],
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0.2,
                ]);

            if ($response->successful()) {
                $payload = $response->json();
                $content = json_decode($payload['choices'][0]['message']['content'] ?? '{}', true) ?: [];

                // Sanitize output for non-diagnostic guardrails
                $summary = $this->sanitizeDiagnosticClaims($content['plain_language_summary'] ?? '');
                $findings = $content['key_findings'] ?? [];
                $questions = $content['doctor_questions'] ?? [];
                $missing = $content['missing_information'] ?? [];

                return [
                    'status' => 'success',
                    'ai_configured' => true,
                    'plain_language_summary' => $summary ?: $this->generateDeterministicExplanation($text, $entities),
                    'key_findings' => !empty($findings) ? $findings : $this->formatFindings($deterministic, $entities),
                    'doctor_questions' => !empty($questions) ? $questions : $this->generateDeterministicQuestions($entities),
                    'missing_information' => !empty($missing) ? $missing : $this->detectMissingInfo($entities, $deterministic),
                    'clinical_disclaimer' => self::NON_DIAGNOSTIC_DISCLAIMER,
                    'deterministic_analysis' => $deterministic,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('OpenAI Clinical Analysis failed: ' . $e->getMessage());
        }

        // Safe fallback if API call fails
        return [
            'status' => 'fallback',
            'ai_configured' => false,
            'message' => 'AI report analysis is not configured.',
            'plain_language_summary' => $this->generateDeterministicExplanation($text, $entities),
            'key_findings' => $this->formatFindings($deterministic, $entities),
            'doctor_questions' => $this->generateDeterministicQuestions($entities),
            'missing_information' => $this->detectMissingInfo($entities, $deterministic),
            'clinical_disclaimer' => self::NON_DIAGNOSTIC_DISCLAIMER,
            'deterministic_analysis' => $deterministic,
        ];
    }

    /**
     * Plain-language explanation ("Explain this report") suitable for seniors and families.
     */
    public function explain(string $reportText): array
    {
        $analysis = $this->analyze($reportText);

        return [
            'title' => 'Plain-Language Report Explanation',
            'reading_level' => 'Grade 6 (Accessible)',
            'summary' => $analysis['plain_language_summary'],
            'key_points' => $analysis['key_findings'],
            'missing_items' => $analysis['missing_information'],
            'disclaimer' => self::NON_DIAGNOSTIC_DISCLAIMER,
            'ai_assisted' => $analysis['ai_configured'] ?? false,
        ];
    }

    /**
     * Fact-based doctor question generator ("Questions for my doctor").
     */
    public function generateDoctorQuestions(string $reportText): array
    {
        $analysis = $this->analyze($reportText);

        return [
            'title' => 'Questions for Your Next Doctor Visit',
            'purpose' => 'Take this checklist with you to your next clinic appointment.',
            'questions' => $analysis['doctor_questions'],
            'disclaimer' => self::NON_DIAGNOSTIC_DISCLAIMER,
        ];
    }

    /**
     * Deterministic plain-language explanation when AI is offline or unconfigured.
     */
    protected function generateDeterministicExplanation(string $text, array $entities): string
    {
        $conditions = $entities['conditions'] ?? [];
        $medications = $entities['medications'] ?? [];

        $parts = ['This report documents health observations and notes from your healthcare visit.'];

        if (!empty($conditions)) {
            $condList = implode(', ', array_slice($conditions, 0, 3));
            $parts[] = "It mentions findings related to {$condList}.";
        }

        if (!empty($medications)) {
            $medList = implode(', ', array_slice($medications, 0, 3));
            $parts[] = "Documented medications include {$medList}.";
        }

        $parts[] = 'These notes help you and your caregiver track daily routines. They do not constitute a diagnosis of dementia.';

        return implode(' ', $parts);
    }

    protected function formatFindings(array $deterministic, array $entities): array
    {
        $findings = [];

        foreach ($entities['conditions'] ?? [] as $cond) {
            $findings[] = [
                'item' => $cond,
                'explanation' => "Mentioned as an active or historical condition in the report.",
                'source_text' => 'Report findings',
            ];
        }

        foreach ($entities['medications'] ?? [] as $med) {
            $findings[] = [
                'item' => $med,
                'explanation' => "Documented prescription or scheduled medication.",
                'source_text' => 'Medication section',
            ];
        }

        if (empty($findings)) {
            $findings[] = [
                'item' => 'General Clinical Consultation',
                'explanation' => 'Routine clinical visit notes without specific isolated conditions.',
                'source_text' => 'Consultation text',
            ];
        }

        return $findings;
    }

    protected function generateDeterministicQuestions(array $entities): array
    {
        $questions = [];

        foreach ($entities['medications'] ?? [] as $med) {
            $questions[] = "Should I continue taking {$med} at the exact same time and dosage?";
            if (count($questions) >= 2) break;
        }

        foreach ($entities['conditions'] ?? [] as $cond) {
            $questions[] = "Are there any specific lifestyle habits or exercises that help manage {$cond}?";
            if (count($questions) >= 4) break;
        }

        $questions[] = "When should we schedule our next follow-up visit?";
        $questions[] = "Are there any warning signs or changes we should watch for at home?";

        return array_values(array_unique($questions));
    }

    protected function detectMissingInfo(array $entities, array $deterministic): array
    {
        $missing = [];

        if (empty($entities['medications'])) {
            $missing[] = 'Medication schedule: Not provided in report';
        }
        if (empty($deterministic['explicit_clinical_measures'])) {
            $missing[] = 'Standard cognitive assessment scores (e.g. MoCA, MMSE): Not provided in report';
        }
        $missing[] = 'Target blood pressure range: Not provided in report';
        $missing[] = 'Date for next clinic visit: Not provided in report';

        return $missing;
    }

    protected function sanitizeDiagnosticClaims(string $text): string
    {
        // Strip diagnostic assertions if generated
        $sanitized = preg_replace('/\b(you have|diagnosed with)\s+(dementia|alzheimer)/i', 'evaluating cognitive wellness', $text);
        $sanitized = preg_replace('/\b(stage\s+[1-7]|clinical stage)\b/i', 'current wellness status', $sanitized);
        return trim($sanitized);
    }
}
