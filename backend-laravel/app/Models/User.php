<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function cognitiveSessions(): HasMany
    {
        return $this->hasMany(CognitiveSession::class);
    }

    public function trainingBaselines(): HasMany
    {
        return $this->hasMany(TrainingBaseline::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    public function dailyTasks(): HasMany
    {
        return $this->hasMany(DailyTask::class);
    }

    public function privacyConsents(): HasMany
    {
        return $this->hasMany(PrivacyConsent::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function clinicalReports(): HasMany
    {
        return $this->hasMany(ClinicalReport::class);
    }

    // Caregiver-patient relationships
    public function linkedPatients(): HasMany
    {
        return $this->hasMany(CaregiverPatientLink::class, 'caregiver_user_id');
    }

    public function linkedCaregivers(): HasMany
    {
        return $this->hasMany(CaregiverPatientLink::class, 'patient_user_id');
    }

    public function caregiverAlertsReceived(): HasMany
    {
        return $this->hasMany(CaregiverAlert::class, 'caregiver_id');
    }

    public function getRoleValue(): string
    {
        if ($this->role instanceof UserRole) {
            return $this->role->value;
        }

        return (string) ($this->role ?? '');
    }

    public function isPatient(): bool
    {
        return $this->getRoleValue() === UserRole::Patient->value;
    }

    public function isCaregiver(): bool
    {
        return $this->getRoleValue() === UserRole::Caregiver->value;
    }

    public function isHealthWorker(): bool
    {
        return $this->getRoleValue() === UserRole::HealthWorker->value;
    }

    public function isAdmin(): bool
    {
        return $this->getRoleValue() === UserRole::Admin->value;
    }

    public function hasRole(UserRole|string ...$roles): bool
    {
        $current = $this->getRoleValue();

        foreach ($roles as $r) {
            $val = $r instanceof UserRole ? $r->value : (string) $r;
            if ($current === $val) {
                return true;
            }
        }

        return false;
    }
}
