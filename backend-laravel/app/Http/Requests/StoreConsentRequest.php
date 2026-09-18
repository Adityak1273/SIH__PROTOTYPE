<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreConsentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'consent_version' => ['required', 'string', 'max:30'],
            'purpose' => ['required', 'in:core_app,analytics,notifications'],
            'accepted' => ['required', 'boolean'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
