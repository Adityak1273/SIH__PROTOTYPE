<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReminderRequest;
use App\Http\Requests\UpdateReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class ReminderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $targetPatientId = $request->query('patient_id') ? (int) $request->query('patient_id') : $user->id;

        // Cross-patient authorization check
        if ($targetPatientId !== $user->id) {
            $hasActiveLink = \App\Models\CaregiverPatientLink::where('caregiver_user_id', $user->id)
                ->where('patient_user_id', $targetPatientId)
                ->where('status', 'active')
                ->exists();

            if (!$hasActiveLink) {
                abort(403, 'Unauthorized: Cross-patient reminder access is forbidden.');
            }
        }

        $reminders = Reminder::where('user_id', $targetPatientId)
            ->where('active', true)
            ->orderBy('reminder_time')
            ->get();

        return ReminderResource::collection($reminders);
    }

    public function store(StoreReminderRequest $request): JsonResponse
    {
        $user = $request->user();
        $targetUserId = $request->input('patient_id') ? (int) $request->input('patient_id') : $user->id;
        $targetPatient = \App\Models\User::findOrFail($targetUserId);

        $this->authorize('create', [Reminder::class, $targetPatient]);

        $clientId = $request->input('client_id');

        // Adversarial Defense: Idempotent deduplication by client_id
        if ($clientId) {
            $existing = Reminder::where('user_id', $targetUserId)
                ->where('client_id', $clientId)
                ->first();

            if ($existing) {
                return (new ReminderResource($existing))
                    ->response()
                    ->setStatusCode(200);
            }
        }

        // Adversarial Defense: Duplicate reminder suppression within identical time slot
        $duplicate = Reminder::where('user_id', $targetUserId)
            ->where('title', $request->input('title'))
            ->where('reminder_time', $request->input('reminder_time'))
            ->where('active', true)
            ->first();

        if ($duplicate) {
            return (new ReminderResource($duplicate))
                ->response()
                ->setStatusCode(200);
        }

        $reminder = Reminder::create([
            'id' => (string) Str::uuid(),
            'client_id' => $clientId ?? (string) Str::uuid(),
            'user_id' => $targetUserId,
            'created_by_user_id' => $user->id,
            'title' => $request->input('title'),
            'reminder_time' => $request->input('reminder_time'),
            'repeat_rule' => $request->input('repeat_rule', 'daily'),
            'kind' => $request->input('kind'),
            'active' => $request->input('active', true),
        ]);

        return (new ReminderResource($reminder))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Reminder $reminder): ReminderResource
    {
        $this->authorize('view', $reminder);
        return new ReminderResource($reminder);
    }

    public function update(UpdateReminderRequest $request, Reminder $reminder): ReminderResource
    {
        $this->authorize('update', $reminder);
        $reminder->update($request->validated());
        return new ReminderResource($reminder);
    }

    public function destroy(Reminder $reminder): JsonResponse
    {
        $this->authorize('delete', $reminder);
        $reminder->delete();
        return response()->json(['message' => 'Reminder deleted successfully.']);
    }
}
