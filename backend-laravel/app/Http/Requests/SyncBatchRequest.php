<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyncBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'sessions' => ['nullable', 'array'],
            'sessions.*.client_session_id' => ['required', 'string'],
            'sessions.*.started_at' => ['required', 'date'],
            'sessions.*.overall_score' => ['required', 'integer'],
            'sessions.*.accuracy' => ['required', 'numeric'],
            'sessions.*.avg_response_time_seconds' => ['required', 'numeric'],
            'sessions.*.games_completed' => ['required', 'integer'],
            'sessions.*.game_order' => ['required', 'array'],
            'sessions.*.results' => ['required', 'array'],
            'tasks' => ['nullable', 'array'],
            'tasks.*.title' => ['required', 'string'],
            'tasks.*.task_date' => ['nullable', 'date'],
            'tasks.*.completed' => ['required', 'boolean'],
            'client_timestamp' => ['nullable', 'string'],
        ];
    }
}
