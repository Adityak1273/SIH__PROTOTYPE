<?php

namespace App\Http\Requests;

use App\Enums\ReminderKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'string'],
            'patient_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:100'],
            'reminder_time' => ['required', 'date_format:H:i'],
            'repeat_rule' => ['required', 'in:daily,once'],
            'kind' => ['required', new Enum(ReminderKind::class)],
            'active' => ['nullable', 'boolean'],
        ];
    }
}
