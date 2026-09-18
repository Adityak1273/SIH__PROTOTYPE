<?php

namespace App\Services;

use App\Models\ClinicalReport;
use App\Models\User;
use Illuminate\Support\Str;

class ClinicalIntelligenceService
{
    protected array $domains = [
        'memory' => ['memory loss', 'forgetful', 'forgetfulness', 'recall', 'repeats', 'short-term memory'],
        'attention' => ['attention', 'concentration', 'distract', 'inattentive', 'focus'],
        'executive' => ['planning', 'problem solving', 'executive', 'judgment', 'multistep', 'organisation'],
        'language' => ['aphasia', 'word finding', 'word-finding', 'speech', 'communication'],
        'visuospatial' => ['visuospatial', 'spatial', 'getting lost', 'navigation', 'visual'],
        'orientation' => ['disoriented', 'orientation', 'date', 'time', 'place', 'confusion'],
        'function' => ['activities of daily living', 'adl', 'iadl', 'dressing', 'bathing', 'medication management'],
        'mood' => ['depression', 'anxiety', 'apathy', 'agitation', 'irritable', 'withdrawn'],
    ];

    /**
     * Deterministic text analysis extracting documented cognitive concerns and explicit clinical scores.
     * Ported from clinical-intelligence.js.
     * Strictly does not diagnose or invent scores.
     */
    public function analyzeText(string $text): array
    {
        $lower = mb_strtolower($text);
        $extractedDomains = [];

        foreach ($this->domains as $domain => $keywords) {
            $hits = array_values(array_filter($keywords, fn($k) => str_contains($lower, $k)));
            if (!empty($hits)) {
                $extractedDomains[$domain] = [
                    'concern' => true,
                    'confidence' => 0.70,
                    'evidence' => array_slice($hits, 0, 3),
                ];
            }
        }

        // Extract explicit clinical measures documented by clinicians
        $explicitMeasures = [];
        if (preg_match('/\b(gds|global deterioration scale)\s*(?:stage)?\s*([1-7])\b/i', $text, $m)) {
            $explicitMeasures[] = ['scale' => 'GDS', 'value' => (int) $m[2], 'source' => 'clinician note'];
        }
        if (preg_match('/\b(?:cdr|clinical dementia rating)\s*(?:score|=|:)?\s*(0(?:\.5)?|[1-3])\b/i', $text, $m)) {
            $explicitMeasures[] = ['scale' => 'CDR', 'value' => (float) $m[1], 'source' => 'clinician note'];
        }
        if (preg_match('/\bmoca\s*(?:score|=|:)?\s*(\d{1,2})\b/i', $text, $m)) {
            $explicitMeasures[] = ['scale' => 'MoCA', 'value' => (int) $m[1], 'source' => 'clinician note'];
        }
        if (preg_match('/\bmmse\s*(?:score|=|:)?\s*(\d{1,2})\b/i', $text, $m)) {
            $explicitMeasures[] = ['scale' => 'MMSE', 'value' => (int) $m[1], 'source' => 'clinician note'];
        }

        // Acute red flags requiring immediate medical evaluation
        $redFlagTerms = ['sudden confusion', 'acute confusion', 'delirium', 'new weakness', 'stroke', 'fall', 'hallucination', 'fainting', 'seizure'];
        $redFlags = array_values(array_filter($redFlagTerms, fn($t) => str_contains($lower, $t)));

        return [
            'analyzed_at' => now()->toIso8601String(),
            'domains' => $extractedDomains,
            'explicit_clinical_measures' => $explicitMeasures,
            'red_flags' => $redFlags,
            'functional_impact' => isset($extractedDomains['function'])
                ? 'Report contains documented functional/ADL concerns.'
                : 'Functional impact not established from supplied text.',
            'clinical_disclaimer' => 'These results structure documented clinical information. Game scores and text extraction do not establish a diagnosis of dementia.',
        ];
    }

    public function storeReport(User $patient, ?User $creator, string $title, string $text): ClinicalReport
    {
        $analysis = $this->analyzeText($text);

        return ClinicalReport::create([
            'id' => (string) Str::uuid(),
            'user_id' => $patient->id,
            'created_by_user_id' => $creator?->id,
            'report_title' => $title,
            'source_type' => 'text',
            'analysis' => $analysis,
        ]);
    }
}
