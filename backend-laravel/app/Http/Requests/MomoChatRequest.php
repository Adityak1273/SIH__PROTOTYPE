<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MomoChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:2000'],
            'history' => ['nullable', 'array'],
            'screen' => ['nullable', 'string', 'max:50'],
            'game' => ['nullable', 'string', 'max:50'],
            'level' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }
}
