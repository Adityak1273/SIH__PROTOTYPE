<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class PurgeUserDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function handle(): void
    {
        DB::transaction(function () {
            // Delete all user records
            $this->user->cognitiveSessions()->delete();
            $this->user->trainingBaselines()->delete();
            $this->user->reminders()->delete();
            $this->user->dailyTasks()->delete();
            $this->user->clinicalReports()->delete();
            $this->user->privacyConsents()->delete();
            $this->user->profile()?->delete();
            $this->user->delete();
        });
    }
}
