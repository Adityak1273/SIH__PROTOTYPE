<?php

namespace App\Models;

use App\Enums\GameKey;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameResult extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'cognitive_session_id',
        'user_id',
        'game_key',
        'trial_number',
        'is_correct',
        'response_time_seconds',
        'difficulty_level',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'game_key' => GameKey::class,
            'is_correct' => 'boolean',
            'response_time_seconds' => 'float',
            'difficulty_level' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function cognitiveSession(): BelongsTo
    {
        return $this->belongsTo(CognitiveSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
