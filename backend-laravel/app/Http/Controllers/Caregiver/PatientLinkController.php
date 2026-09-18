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
    public function invite(InvitePatientRequest $request): JsonResponse|RedirectResponse
    {
        $caregiver = $request->user();
        $patient = User::where('email', $request->input('patient_email'))->first();

        if (!$patient) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'PATIENT_NOT_FOUND', 'message' => 'No user account found with that email.'], 404);
            }
            return redirect()->back()->withErrors(['patient_email' => 'Patient user account not found.']);
        }

        // Adversarial Defense 1: Forbid self-linking
        if ($caregiver->id === $patient->id) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'SELF_LINK_FORBIDDEN', 'message' => 'A caregiver cannot link themselves as their own patient.'], 422);
            }
            return redirect()->back()->withErrors(['patient_email' => 'You cannot link your own account as a patient.']);
        }

        // Adversarial Defense 2: Forbid linking non-patient roles
        if (!$patient->isPatient()) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'INVALID_TARGET_ROLE', 'message' => 'Target user is not registered with a patient role.'], 422);
            }
            return redirect()->back()->withErrors(['patient_email' => 'Target user is not registered as a patient.']);
        }

        // Adversarial Defense 3: Enforce CaregiverRules limit (max 10 active patients for individual caregivers)
        $activeCount = CaregiverPatientLink::where('caregiver_user_id', $caregiver->id)
            ->where('status', LinkStatus::Active)
            ->count();

        if (!$caregiver->isHealthWorker() && $activeCount >= 10) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'PATIENT_LIMIT_EXCEEDED', 'message' => 'Individual caregivers cannot actively link more than 10 patients.'], 422);
            }
            return redirect()->back()->withErrors(['patient_email' => 'Maximum active patient limit (10) reached for your caregiver tier.']);
        }

        $link = CaregiverPatientLink::updateOrCreate(
            [
                'caregiver_user_id' => $caregiver->id,
                'patient_user_id' => $patient->id,
            ],
            [
                'id' => (string) Str::uuid(),
                'status' => LinkStatus::Active,
                'permissions' => [
                    'can_manage_reminders' => (bool) $request->input('can_manage_reminders', true),
                    'view_clinical_reports' => (bool) $request->input('view_clinical_reports', true),
                ],
                'linked_at' => now(),
            ]
        );

        if ($request->expectsJson()) {
            return response()->json([
                'message' => "Patient {$patient->name} successfully linked.",
                'link_id' => $link->id,
                'status' => $link->status->value,
            ], 201);
        }

        return redirect()->back()->with('success', "Patient {$patient->name} successfully linked.");
    }

    public function revoke(CaregiverPatientLink $link): JsonResponse
    {
        $userId = request()->user()->id;
        if ($userId !== $link->caregiver_user_id && $userId !== $link->patient_user_id) {
            abort(403, 'Unauthorized to revoke this relationship link.');
        }

        $link->update(['status' => LinkStatus::Revoked]);

        return response()->json([
            'message' => 'Relationship link revoked successfully.',
            'status' => LinkStatus::Revoked->value,
        ]);
    }
}
