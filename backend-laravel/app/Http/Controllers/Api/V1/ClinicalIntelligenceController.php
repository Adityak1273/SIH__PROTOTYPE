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
    public function __construct(protected ClinicalIntelligenceService $clinicalService)
    {
    }

    public function analyze(AnalyzeClinicalReportRequest $request): JsonResponse
    {
        $targetUser = $request->input('patient_id')
            ? User::findOrFail($request->input('patient_id'))
            : $request->user();

        $report = $this->clinicalService->storeReport(
            $targetUser,
            $request->user(),
            $request->input('title'),
            $request->input('report_text')
        );

        return response()->json([
            'message' => 'Report analyzed and structured successfully.',
            'report' => $report,
        ], 201);
    }

    public function getProfile(Request $request): JsonResponse
    {
        $patientId = $request->query('patient_id') ?: $request->user()->id;

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
