<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'full_name',
        'preferred_name',
        'date_of_birth',
        'age',
        'gender',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'country',
        'emergency_contact',
        'emergency_relationship',
        'caregiver_info',
        'health_background',
        'daily_life_background',
        'accessibility_settings',
        'privacy_preferences',
        'momo_name',
        'voice_preference',
        'region',
        'preferred_language',
        'additional_languages',
        'accessibility_mode',
        'avatar_path',
        'profile_complete',
        'onboarding_step',
        'profile_completion_pct',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'profile_complete' => 'boolean',
            'additional_languages' => 'array',
            'caregiver_info' => 'array',
            'health_background' => 'array',
            'daily_life_background' => 'array',
            'accessibility_settings' => 'array',
            'privacy_preferences' => 'array',
            'onboarding_step' => 'integer',
            'profile_completion_pct' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
