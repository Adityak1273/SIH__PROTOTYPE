<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ExportUserDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function handle(): void
    {
        $uid = $this->user->id;

        $export = [
            'exported_at' => now()->toIso8601String(),
            'privacy_version' => '2026-09-05-v1',
            'notice' => 'This export contains your Cognitive Care NER application data. Training results are not a medical diagnosis.',
            'profile' => $this->user->profile,
            'sessions' => $this->user->cognitiveSessions()->with('gameResults')->get(),
            'baselines' => $this->user->trainingBaselines,
            'reminders' => $this->user->reminders,
            'tasks' => $this->user->dailyTasks,
            'consents' => $this->user->privacyConsents,
            'audit_log' => $this->user->auditLogs,
        ];

        $filename = "exports/user_{$uid}_" . now()->format('YmdHis') . '.json';
        Storage::disk('local')->put($filename, json_encode($export, JSON_PRETTY_PRINT));
    }
}
