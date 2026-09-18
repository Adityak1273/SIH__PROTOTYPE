<?php

namespace App\Models;

use App\Enums\ReminderKind;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reminder extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'client_id',
        'user_id',
        'created_by_user_id',
        'title',
        'reminder_time',
        'repeat_rule',
        'kind',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'kind' => ReminderKind::class,
            'active' => 'boolean',
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
