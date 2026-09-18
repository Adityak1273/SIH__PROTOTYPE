<?php

namespace App\Enums;

enum ReminderKind: string
{
    case Medicine = 'medicine';
    case Hydration = 'hydration';
    case Appointment = 'appointment';
    case DailyActivity = 'daily_activity';
    case General = 'general';

    public function defaultMessage(): string
    {
        return match ($this) {
            self::Medicine => 'Please take your medicine now.',
            self::Hydration => 'Please drink a little water now.',
            self::Appointment => 'You have an appointment reminder.',
            self::DailyActivity => 'It is time for your planned daily activity.',
            self::General => 'It is time for your reminder.',
        };
    }
}
