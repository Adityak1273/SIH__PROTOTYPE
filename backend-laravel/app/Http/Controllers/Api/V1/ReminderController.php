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
        $userId = $request->query('patient_id') ?: $request->user()->id;

        $reminders = Reminder::where('user_id', $userId)
            ->where('active', true)
            ->orderBy('reminder_time')
            ->get();

        return ReminderResource::collection($reminders);
    }

    public function store(StoreReminderRequest $request): JsonResponse
    {
        $user = $request->user();
        $targetUserId = $request->input('patient_id') ?: $user->id;

        $reminder = Reminder::create([
            'id' => (string) Str::uuid(),
            'client_id' => $request->input('client_id') ?? (string) Str::uuid(),
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
