<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DailyTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DailyTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->query('patient_id') ?: $request->user()->id;
        $date = $request->query('date') ?: now()->toDateString();

        $tasks = DailyTask::where('user_id', $userId)
            ->where('task_date', $date)
            ->get();

        return response()->json(['tasks' => $tasks]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'task_date' => ['nullable', 'date'],
        ]);

        $task = DailyTask::create([
            'id' => (string) Str::uuid(),
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'task_date' => $validated['task_date'] ?? now()->toDateString(),
            'completed' => false,
        ]);

        return response()->json(['task' => $task], 201);
    }

    public function update(Request $request, DailyTask $dailyTask): JsonResponse
    {
        if ($request->user()->id !== $dailyTask->user_id) {
            abort(403);
        }

        $validated = $request->validate([
            'completed' => ['required', 'boolean'],
        ]);

        $dailyTask->update([
            'completed' => $validated['completed'],
            'completed_at' => $validated['completed'] ? now() : null,
        ]);

        return response()->json(['task' => $dailyTask]);
    }
}
