<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Str;

class AuditLogService
{
    /**
     * Appends an immutable audit log entry.
     * Ported from security-center.js.
     */
    public function record(?User $user, string $action, ?string $entityType = null, ?string $entityId = null, ?array $metadata = []): AuditLog
    {
        return AuditLog::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user?->id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => array_merge($metadata ?? [], [
                'app' => 'cognitive_care_ner',
                'privacy_version' => '2026-09-05-v1',
            ]),
            'created_at' => now(),
        ]);
    }
}
