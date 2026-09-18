<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyzeClinicalReportRequest;
use App\Models\ClinicalReport;
use App\Models\User;
use App\Services\ClinicalIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicalIntelligenceController extends Controller
{
    public function __construct(
        protected ClinicalIntelligenceService $clinicalService,
        protected \App\Services\ClinicalReportAnalysisService $analysisService
    ) {
    }

    public function analyze(AnalyzeClinicalReportRequest $request): JsonResponse
    {
        $targetUser = $request->input('patient_id')
            ? User::findOrFail($request->input('patient_id'))
            : $request->user();

        if ($targetUser->id !== $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
            abort(403, 'Unauthorized access to patient data.');
        }

        $text = $request->input('report_text');
        $report = $this->clinicalService->storeReport(
            $targetUser,
            $request->user(),
            $request->input('title'),
            $text
        );

        $analysis = $this->analysisService->analyze($text, $targetUser);

        return response()->json([
            'message' => 'Report analyzed and structured successfully.',
            'report' => $report,
            'plain_language_explanation' => $analysis['plain_language_summary'] ?? null,
            'doctor_questions' => $analysis['doctor_questions'] ?? [],
            'key_findings' => $analysis['key_findings'] ?? [],
            'missing_information' => $analysis['missing_information'] ?? [],
            'ai_status' => $analysis['status'] ?? 'fallback',
            'clinical_disclaimer' => $analysis['clinical_disclaimer'] ?? 'Non-diagnostic.',
        ], 201);
    }

    /**
     * Plain-language report explanation ("Explain this report").
     */
    public function explain(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_id' => ['nullable', 'uuid', 'exists:clinical_reports,id'],
            'report_text' => ['nullable', 'string', 'max:50000'],
            'locale' => ['nullable', 'string', 'max:10'],
        ]);

        $text = $validated['report_text'] ?? '';
        if (empty($text) && !empty($validated['report_id'])) {
            $report = ClinicalReport::findOrFail($validated['report_id']);
            if ($report->user_id !== $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
                abort(403, 'Unauthorized access to report data.');
            }
            $text = $report->extracted_text ?? '';
        }

        if (empty(trim($text))) {
            return response()->json(['message' => 'Report text or valid report_id is required.'], 422);
        }

        $result = $this->analysisService->explain($text);

        return response()->json($result);
    }

    /**
     * Fact-based doctor question generator ("Questions for my doctor").
     */
    public function doctorQuestions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_id' => ['nullable', 'uuid', 'exists:clinical_reports,id'],
            'report_text' => ['nullable', 'string', 'max:50000'],
        ]);

        $text = $validated['report_text'] ?? '';
        if (empty($text) && !empty($validated['report_id'])) {
            $report = ClinicalReport::findOrFail($validated['report_id']);
            if ($report->user_id !== $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
                abort(403, 'Unauthorized access to report data.');
            }
            $text = $report->extracted_text ?? '';
        }

        if (empty(trim($text))) {
            return response()->json(['message' => 'Report text or valid report_id is required.'], 422);
        }

        $result = $this->analysisService->generateDoctorQuestions($text);

        return response()->json($result);
    }

    /**
     * Intake report via text paste, manual entry, or uploaded file.
     * Extracts candidate entities and returns them for user confirmation.
     * Does NOT treat extracted information as verified medical truth.
     */
    public function intakeReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'source_type' => ['nullable', 'string', 'in:user_provided,caregiver_provided,doctor_report,uploaded_document,manually_entered'],
            'report_text' => ['nullable', 'string', 'max:50000'],
            'file' => ['nullable', 'file', 'mimes:pdf,txt,png,jpg,jpeg', 'max:10240'],
            'patient_id' => ['nullable', 'integer'],
        ]);

        $targetUser = !empty($validated['patient_id'])
            ? User::findOrFail($validated['patient_id'])
            : $request->user();

        if ($targetUser->id !== $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
            abort(403, 'Unauthorized access to patient data.');
        }

        $text = $validated['report_text'] ?? '';
        $filename = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = $file->getClientOriginalName();
            // Basic text extraction for text files or file metadata representation
            if ($file->getClientMimeType() === 'text/plain') {
                $text = file_get_contents($file->getRealPath());
            } else {
                $text .= "\n[Uploaded document: {$filename}]";
            }
        }

        $sourceType = $validated['source_type'] ?? 'doctor_report';

        $report = $this->clinicalService->storeReport(
            $targetUser,
            $request->user(),
            $validated['title'],
            $text,
            $sourceType,
            $filename
        );

        return response()->json([
            'message' => 'Report processed. Possible information extracted for user confirmation.',
            'report_id' => $report->id,
            'title' => $report->report_title,
            'source_type' => $report->source_attribution,
            'possible_information_found' => $report->extracted_entities,
            'clinical_notice' => 'Cognitive training information is not a medical diagnosis. Extracted items must be confirmed before addition to your health background.',
        ], 201);
    }

    /**
     * User confirmation of extracted entities: Confirm, Edit, or Ignore.
     */
    public function confirmEntities(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_id' => ['required', 'uuid', 'exists:clinical_reports,id'],
            'decisions' => ['required', 'array'],
            'decisions.*.entity_type' => ['required', 'string', 'in:conditions,medications,allergies'],
            'decisions.*.original_value' => ['required', 'string'],
            'decisions.*.status' => ['required', 'string', 'in:confirmed,edited,ignored'],
            'decisions.*.final_value' => ['nullable', 'string'],
        ]);

        $report = ClinicalReport::findOrFail($validated['report_id']);

        // Patient authorization check
        if ($report->user_id !== $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
            return response()->json(['message' => 'Unauthorized report access.'], 403);
        }

        $confirmed = $this->clinicalService->confirmEntities($report, $validated['decisions']);

        return response()->json([
            'message' => 'Candidate information confirmed and synchronized with patient health background.',
            'confirmed_entities' => $confirmed,
            'patient_profile' => $report->user->profile,
        ]);
    }

    public function getProfile(Request $request): JsonResponse
    {
        $patientId = $request->query('patient_id') ?: $request->user()->id;

        if ($patientId != $request->user()->id && !$request->user()->hasRole('caregiver', 'health_worker', 'admin')) {
            abort(403, 'Unauthorized access to patient data.');
        }

        $latestReport = ClinicalReport::where('user_id', $patientId)
            ->latest()
            ->first();

        return response()->json([
            'profile' => $latestReport?->analysis,
            'report_title' => $latestReport?->report_title,
            'analyzed_at' => $latestReport?->created_at?->toIso8601String(),
        ]);
    }
}
