<?php

namespace App\Models;

use App\Enums\LinkStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaregiverPatientLink extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'caregiver_user_id',
        'patient_user_id',
        'status',
        'permissions',
        'linked_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => LinkStatus::class,
            'permissions' => 'array',
            'linked_at' => 'datetime',
        ];
    }

    public function caregiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caregiver_user_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_user_id');
    }

    public function isActive(): bool
    {
        if ($this->status instanceof LinkStatus) {
            return $this->status === LinkStatus::Active;
        }

        return $this->status === 'active';
    }

    public function canViewProgress(): bool
    {
        return $this->isActive() && (bool) ($this->permissions['can_view_trends'] ?? $this->permissions['view_progress'] ?? true);
    }

    public function canManageReminders(): bool
    {
        return $this->isActive() && (bool) ($this->permissions['can_manage_reminders'] ?? true);
    }

    public function canReceiveAlerts(): bool
    {
        return $this->isActive() && (bool) ($this->permissions['can_receive_alerts'] ?? true);
    }

    public function canViewClinicalReports(): bool
    {
        return $this->isActive() && (bool) ($this->permissions['view_clinical_reports'] ?? false);
    }
}
