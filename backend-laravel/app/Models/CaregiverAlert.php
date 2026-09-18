<?php

namespace App\Models;

use App\Enums\AlertSeverity;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaregiverAlert extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'patient_id',
        'caregiver_id',
        'type',
        'severity',
        'title',
        'message',
        'source_session_id',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'severity' => AlertSeverity::class,
            'acknowledged_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function caregiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caregiver_id');
    }

    public function sourceSession(): BelongsTo
    {
        return $this->belongsTo(CognitiveSession::class, 'source_session_id');
    }

    public function isAcknowledged(): bool
    {
        return $this->acknowledged_at !== null;
    }
}
