<?php

namespace App\Models;

use App\Enums\CognitiveDomain;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingBaseline extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'domain',
        'score',
        'sample_count',
        'captured_at',
    ];

    protected function casts(): array
    {
        return [
            'domain' => CognitiveDomain::class,
            'score' => 'float',
            'sample_count' => 'integer',
            'captured_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
