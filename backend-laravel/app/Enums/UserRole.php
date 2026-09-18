<?php

namespace App\Enums;

enum UserRole: string
{
    case Patient = 'patient';
    case Caregiver = 'caregiver';
    case HealthWorker = 'health_worker';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Patient => 'Patient (Older Adult)',
            self::Caregiver => 'Caregiver',
            self::HealthWorker => 'Community Health Worker',
            self::Admin => 'System Administrator',
        };
    }
}
