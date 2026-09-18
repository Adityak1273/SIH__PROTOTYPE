<?php

namespace App\Http\Controllers\Privacy;

use App\Http\Controllers\Controller;
use App\Jobs\ExportUserDataJob;
use App\Jobs\PurgeUserDataJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataRightsController extends Controller
{
    /**
     * Dispatches asynchronous user data export (GDPR / DPDP compliance).
     * Ported from security-center.js.
     */
    public function requestExport(Request $request): JsonResponse
    {
        ExportUserDataJob::dispatch($request->user());

        return response()->json([
            'message' => 'Your application data export has been queued. You will receive a secure download link.',
        ]);
    }

    /**
     * Dispatches right-to-erasure account data purge.
     */
    public function purgeAllData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'confirm_deletion' => ['required', 'accepted'],
        ]);

        PurgeUserDataJob::dispatch($request->user());

        return response()->json([
            'message' => 'Account and cognitive data purge has been scheduled and will be completed within 24 hours.',
        ]);
    }
}
