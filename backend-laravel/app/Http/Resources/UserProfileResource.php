<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'preferred_name' => $this->preferred_name,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'age' => $this->age,
            'gender' => $this->gender,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country ?? 'India',
            'emergency_contact' => $this->emergency_contact,
            'emergency_relationship' => $this->emergency_relationship,
            'caregiver_info' => $this->caregiver_info ?? [],
            'health_background' => $this->health_background ?? [],
            'daily_life_background' => $this->daily_life_background ?? [],
            'accessibility_settings' => $this->accessibility_settings ?? [],
            'privacy_preferences' => $this->privacy_preferences ?? [],
            'momo_name' => $this->momo_name,
            'voice_preference' => $this->voice_preference,
            'region' => $this->region,
            'preferred_language' => $this->preferred_language,
            'additional_languages' => $this->additional_languages ?? [],
            'accessibility_mode' => $this->accessibility_mode,
            'avatar_path' => $this->avatar_path,
            'profile_complete' => $this->profile_complete,
            'onboarding_step' => $this->onboarding_step ?? 1,
            'profile_completion_pct' => $this->profile_completion_pct ?? 20,
        ];
    }
}
