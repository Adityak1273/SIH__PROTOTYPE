<?php

namespace App\Events;

use App\Models\Reminder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReminderMissed
{
    use Dispatchable, SerializesModels;

    public function __construct(public Reminder $reminder)
    {
    }
}
