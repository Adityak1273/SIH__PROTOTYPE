<?php

namespace App\Http\Controllers\Caregiver;

use App\Enums\LinkStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\InvitePatientRequest;
use App\Models\CaregiverPatientLink;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class PatientLinkController extends Controller
{
    public function invite(InvitePatientRequest $request): RedirectResponse
    {
        $caregiver = $request->user();
        $patient = User::where('email', $request->input('patient_email'))->firstOrFail();

        CaregiverPatientLink::updateOrCreate(
            [
                'caregiver_user_id' => $caregiver->id,
                'patient_user_id' => $patient->id,
            ],
            [
                'id' => (string) Str::uuid(),
                'status' => LinkStatus::Active, // For SIH prototype demo; production can use confirmation flow
                'permissions' => [
                    'can_manage_reminders' => (bool) $request->input('can_manage_reminders', true),
                    'view_clinical_reports' => (bool) $request->input('view_clinical_reports', true),
                ],
                'linked_at' => now(),
            ]
        );

        return redirect()->back()->with('success', "Patient {$patient->name} successfully linked.");
    }

    public function revoke(CaregiverPatientLink $link): JsonResponse
    {
        if (request()->user()->id !== $link->caregiver_user_id && request()->user()->id !== $link->patient_user_id) {
            abort(403);
        }

        $link->update(['status' => LinkStatus::Revoked]);

        return response()->json(['message' => 'Relationship link revoked.']);
    }
}
