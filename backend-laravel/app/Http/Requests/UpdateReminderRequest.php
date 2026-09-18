<?php

namespace App\Http\Requests;

use App\Enums\ReminderKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateReminderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:100'],
            'reminder_time' => ['sometimes', 'date_format:H:i'],
            'repeat_rule' => ['sometimes', 'in:daily,once'],
            'kind' => ['sometimes', new Enum(ReminderKind::class)],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
