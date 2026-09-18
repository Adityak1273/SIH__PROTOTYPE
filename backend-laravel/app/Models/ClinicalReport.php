<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalReport extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'created_by_user_id',
        'report_title',
        'original_filename',
        'source_type',
        'extracted_text',
        'analysis',
        'extracted_entities',
        'confirmed_entities',
        'confirmation_status',
        'source_attribution',
        'report_date',
    ];

    protected function casts(): array
    {
        return [
            'analysis' => 'array',
            'extracted_entities' => 'array',
            'confirmed_entities' => 'array',
            'report_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
