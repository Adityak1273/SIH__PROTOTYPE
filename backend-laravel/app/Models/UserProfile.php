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
        'date_of_birth',
        'gender',
        'emergency_contact',
        'emergency_relationship',
        'momo_name',
        'voice_preference',
        'region',
        'preferred_language',
        'accessibility_mode',
        'avatar_path',
        'profile_complete',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'profile_complete' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
