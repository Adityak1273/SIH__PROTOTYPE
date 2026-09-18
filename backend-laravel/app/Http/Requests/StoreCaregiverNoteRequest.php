<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCaregiverNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isCaregiver();
    }

    public function rules(): array
    {
        return [
            'category' => ['required', 'in:observation,routine,medical_check,mood'],
            'content' => ['required', 'string', 'max:2000'],
            'note_date' => ['nullable', 'date'],
        ];
    }
}
