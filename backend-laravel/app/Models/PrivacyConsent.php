<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrivacyConsent extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'consent_version',
        'purpose',
        'accepted_at',
        'revoked_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'revoked_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
