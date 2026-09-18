<?php

namespace App\Http\Controllers\Caregiver;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CaregiverDashboardService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReportExportController extends Controller
{
    public function __construct(
        protected CaregiverDashboardService $dashboardService
    ) {
    }

    /**
     * Generate a printable/downloadable summary report for clinicians/family.
     * Enforces CaregiverPatientPolicy 'exportReport'.
     */
    public function export(Request $request, User $patient): View
    {
        $this->authorize('exportReport', $patient);

        $overview = $this->dashboardService->getPatientOverview($patient);

        return view('caregiver.report_export', [
            'patient' => $patient,
            'overview' => $overview,
            'caregiver' => $request->user(),
            'generated_at' => now()->format('F j, Y - g:ia'),
        ]);
    }

    /**
     * Download structured CSV export of recent sessions.
     */
    public function exportCsv(Request $request, User $patient): Response
    {
        $this->authorize('exportReport', $patient);

        $overview = $this->dashboardService->getPatientOverview($patient);
        $sessions = $overview['recent_sessions'] ?? [];

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"patient_{$patient->id}_cognitive_report.csv\"",
        ];

        $callback = function () use ($patient, $sessions) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Cognitive Care NER — Caregiver Progress Export']);
            fputcsv($handle, ['Patient', $patient->name]);
            fputcsv($handle, ['Export Date', now()->toIso8601String()]);
            fputcsv($handle, ['Notice', 'Game performance describes cognitive training only. Not a dementia diagnosis.']);
            fputcsv($handle, []);
            fputcsv($handle, ['Date', 'Overall Score (%)', 'Accuracy (%)', 'Avg Response Time', 'Games Completed']);

            foreach ($sessions as $s) {
                fputcsv($handle, [
                    $s['date'],
                    $s['overall_score'],
                    $s['accuracy'],
                    $s['response_time'],
                    $s['games_completed'] . ' / 5',
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
