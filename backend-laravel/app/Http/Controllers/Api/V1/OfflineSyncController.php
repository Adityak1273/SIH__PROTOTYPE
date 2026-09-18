<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncBatchRequest;
use App\Http\Resources\SyncBatchResponseResource;
use App\Services\OfflineSyncService;

class OfflineSyncController extends Controller
{
    public function __construct(protected OfflineSyncService $syncService)
    {
    }

    /**
     * Batch sync outbox from offline PWA or Capacitor client.
     */
    public function syncBatch(SyncBatchRequest $request): SyncBatchResponseResource
    {
        $result = $this->syncService->processBatch(
            $request->user(),
            $request->validated()
        );

        return new SyncBatchResponseResource($result);
    }
}
