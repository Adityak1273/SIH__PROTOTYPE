<?php

namespace App\Http\Controllers\Caregiver;

use App\Http\Controllers\Controller;
use App\Http\Resources\CaregiverAlertResource;
use App\Models\CaregiverAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AlertController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $alerts = CaregiverAlert::where('caregiver_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return CaregiverAlertResource::collection($alerts);
    }

    public function acknowledge(Request $request, CaregiverAlert $alert): JsonResponse
    {
        if ($request->user()->id !== $alert->caregiver_id) {
            abort(403);
        }

        $alert->update(['acknowledged_at' => now()]);

        return response()->json(['message' => 'Alert acknowledged.']);
    }
}
