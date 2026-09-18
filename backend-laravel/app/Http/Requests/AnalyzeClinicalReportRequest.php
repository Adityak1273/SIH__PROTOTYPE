<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeClinicalReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:150'],
            'report_text' => ['required', 'string', 'min:10', 'max:50000'],
            'confirmed_decision_support_notice' => ['required', 'accepted'],
        ];
    }
}
