<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CognitiveSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'client_session_id',
        'user_id',
        'session_type',
        'started_at',
        'completed_at',
        'overall_score',
        'accuracy',
        'avg_response_time_seconds',
        'games_completed',
        'game_order',
        'sync_status',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'overall_score' => 'integer',
            'accuracy' => 'float',
            'avg_response_time_seconds' => 'float',
            'games_completed' => 'integer',
            'game_order' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gameResults(): HasMany
    {
        return $this->hasMany(GameResult::class);
    }
}
