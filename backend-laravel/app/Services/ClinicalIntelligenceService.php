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

    /**
     * Deterministic extraction of candidate conditions, medications, and allergies.
     * All items are flagged as candidates requiring explicit user confirmation before profile storage.
     */
    public function extractEntities(string $text): array
    {
        $lower = mb_strtolower($text);

        // Candidate conditions
        $conditionPatterns = [
            'Asthma' => ['\basthma\b', '\bbronchial asthma\b'],
            'Hypertension' => ['\bhypertension\b', '\bhigh blood pressure\b', '\bhtn\b'],
            'Type 2 Diabetes' => ['\bdiabetes\b', '\bt2dm\b', '\bdiabetic\b', '\bblood sugar\b'],
            'Mild Cognitive Impairment' => ['\bmci\b', '\bmild cognitive impairment\b', '\bcognitive decline\b'],
            'Arthritis' => ['\barthritis\b', '\bosteoarthritis\b', '\brheumatoid\b'],
            'Insomnia' => ['\binsomnia\b', '\bsleep disturbance\b', '\bpoor sleep\b'],
            'Stroke' => ['\bstroke\b', '\btia\b', '\btransient ischemic\b'],
            'Hearing Loss' => ['\bhearing loss\b', '\bhearing difficulty\b', '\bdeafness\b'],
            'Visual Impairment' => ['\bcataract\b', '\bglaucoma\b', '\bvisual impairment\b', '\bblurry vision\b'],
        ];

        $foundConditions = [];
        foreach ($conditionPatterns as $label => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match('/' . $pattern . '/i', $text)) {
                    $foundConditions[] = $label;
                    break;
                }
            }
        }

        // Candidate medications (common neuro, cardio, general)
        $medicationPatterns = [
            'Donepezil' => '\bdonepezil\b(?:\s+\d+(?:mg)?)?',
            'Memantine' => '\bmemantine\b(?:\s+\d+(?:mg)?)?',
            'Rivastigmine' => '\brivastigmine\b(?:\s+\d+(?:mg)?)?',
            'Amlodipine' => '\bamlodipine\b(?:\s+\d+(?:mg)?)?',
            'Metformin' => '\bmetformin\b(?:\s+\d+(?:mg)?)?',
            'Atorvastatin' => '\batorvastatin\b(?:\s+\d+(?:mg)?)?',
            'Levothyroxine' => '\blevothyroxine\b(?:\s+\d+(?:mcg|mg)?)?',
            'Aspirin' => '\baspirin\b(?:\s+\d+(?:mg)?)?',
            'Paracetamol' => '\bparacetamol\b(?:\s+\d+(?:mg)?)?',
            'Losartan' => '\blosartan\b(?:\s+\d+(?:mg)?)?',
            'Pantoprazole' => '\bpantoprazole\b(?:\s+\d+(?:mg)?)?',
        ];

        $foundMedications = [];
        foreach ($medicationPatterns as $label => $pattern) {
            if (preg_match('/' . $pattern . '/i', $text, $match)) {
                $foundMedications[] = ucfirst(trim($match[0]));
            }
        }

        // Candidate allergies
        $allergyPatterns = [
            'Penicillin' => '\bpenicillin\b',
            'Sulfa drugs' => '\bsulfa\b|\bsulfonamide\b',
            'Aspirin allergy' => '\baspirin allergy\b',
            'Latex' => '\blatex\b',
            'Peanuts' => '\bpeanut(?:s)?\b',
            'Dust / Pollen' => '\bpollen\b|\bdust allergy\b',
        ];

        $foundAllergies = [];
        foreach ($allergyPatterns as $label => $pattern) {
            if (preg_match('/' . $pattern . '/i', $text)) {
                $foundAllergies[] = $label;
            }
        }

        return [
            'conditions' => array_values(array_unique($foundConditions)),
            'medications' => array_values(array_unique($foundMedications)),
            'allergies' => array_values(array_unique($foundAllergies)),
        ];
    }

    public function storeReport(User $patient, ?User $creator, string $title, string $text, string $sourceType = 'text', ?string $filename = null): ClinicalReport
    {
        $analysis = $this->analyzeText($text);
        $extractedEntities = $this->extractEntities($text);

        return ClinicalReport::create([
            'id' => (string) Str::uuid(),
            'user_id' => $patient->id,
            'created_by_user_id' => $creator?->id,
            'report_title' => $title,
            'original_filename' => $filename,
            'source_type' => $sourceType,
            'source_attribution' => $sourceType,
            'extracted_text' => $text,
            'analysis' => $analysis,
            'extracted_entities' => $extractedEntities,
            'confirmed_entities' => [],
            'confirmation_status' => 'pending_confirmation',
            'report_date' => now()->toDateString(),
        ]);
    }

    /**
     * Confirms or edits extracted candidate entities and syncs confirmed items into the patient profile.
     */
    public function confirmEntities(ClinicalReport $report, array $decisions): array
    {
        $confirmed = [
            'conditions' => [],
            'medications' => [],
            'allergies' => [],
        ];

        foreach ($decisions as $decision) {
            $type = $decision['entity_type'] ?? '';
            $status = $decision['status'] ?? 'ignored'; // 'confirmed', 'edited', 'ignored'
            $finalValue = trim($decision['final_value'] ?? $decision['original_value'] ?? '');

            if (in_array($status, ['confirmed', 'edited']) && !empty($finalValue) && isset($confirmed[$type])) {
                $confirmed[$type][] = [
                    'name' => $finalValue,
                    'status' => $status,
                    'source' => $report->source_attribution ?? 'doctor_report',
                    'confirmed_at' => now()->toIso8601String(),
                ];
            }
        }

        $report->update([
            'confirmed_entities' => $confirmed,
            'confirmation_status' => 'confirmed',
        ]);

        // Merge into patient profile health_background
        $patient = $report->user;
        if ($patient && $patient->profile) {
            $profile = $patient->profile;
            $health = $profile->health_background ?? [];

            $existingConditions = $health['known_conditions'] ?? [];
            $existingMeds = $health['medications'] ?? [];
            $existingAllergies = $health['allergies'] ?? [];

            foreach ($confirmed['conditions'] as $item) {
                if (!in_array($item['name'], $existingConditions)) {
                    $existingConditions[] = $item['name'];
                }
            }
            foreach ($confirmed['medications'] as $item) {
                if (!in_array($item['name'], $existingMeds)) {
                    $existingMeds[] = $item['name'];
                }
            }
            foreach ($confirmed['allergies'] as $item) {
                if (!in_array($item['name'], $existingAllergies)) {
                    $existingAllergies[] = $item['name'];
                }
            }

            $health['known_conditions'] = $existingConditions;
            $health['medications'] = $existingMeds;
            $health['allergies'] = $existingAllergies;

            $profile->update(['health_background' => $health]);
        }

        return $confirmed;
    }
}
