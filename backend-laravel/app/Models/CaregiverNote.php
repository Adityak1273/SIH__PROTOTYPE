<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaregiverNote extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'caregiver_id',
        'patient_id',
        'category',
        'content',
        'note_date',
    ];

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
        ];
    }

    public function caregiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caregiver_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }
}
