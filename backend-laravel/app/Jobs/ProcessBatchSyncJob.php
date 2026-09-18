<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\OfflineSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessBatchSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public User $user, public array $payload)
    {
    }

    public function handle(OfflineSyncService $syncService): void
    {
        $syncService->processBatch($this->user, $this->payload);
    }
}
