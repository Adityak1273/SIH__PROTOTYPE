<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SyncBatchResponseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->resource['status'] ?? 'success',
            'synced_sessions' => $this->resource['synced_sessions'] ?? [],
            'synced_tasks' => $this->resource['synced_tasks'] ?? [],
            'server_time' => $this->resource['server_time'] ?? now()->toIso8601String(),
        ];
    }
}
