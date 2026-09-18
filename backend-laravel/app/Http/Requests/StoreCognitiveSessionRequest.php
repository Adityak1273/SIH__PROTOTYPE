<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCognitiveSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'client_session_id' => ['required', 'string', 'uuid'],
            'session_type' => ['nullable', 'string'],
            'started_at' => ['required', 'date'],
            'completed_at' => ['nullable', 'date'],
            'overall_score' => ['required', 'integer', 'min:0', 'max:100'],
            'accuracy' => ['required', 'numeric', 'min:0', 'max:1'],
            'avg_response_time_seconds' => ['required', 'numeric', 'min:0'],
            'games_completed' => ['required', 'integer', 'min:0', 'max:5'],
            'game_order' => ['required', 'array'],
            'results' => ['required', 'array'],
            'results.*.game' => ['required', 'string'],
            'results.*.trial' => ['required', 'integer'],
            'results.*.correct' => ['required', 'boolean'],
            'results.*.seconds' => ['required', 'numeric'],
            'results.*.difficulty' => ['required', 'integer', 'min:1', 'max:10'],
        ];
    }
}
