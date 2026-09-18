<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InvitePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isCaregiver() ?? false;
    }

    public function rules(): array
    {
        return [
            'patient_email' => ['required', 'email', 'exists:users,email'],
            'can_manage_reminders' => ['nullable', 'boolean'],
            'view_clinical_reports' => ['nullable', 'boolean'],
        ];
    }
}
