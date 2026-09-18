<?php

namespace App\Listeners;

use App\Events\CognitiveSessionCompleted;
use App\Events\ConsentUpdated;
use App\Services\AuditLogService;

class WriteAuditRecord
{
    public function __construct(protected AuditLogService $auditService)
    {
    }

    public function handle(object $event): void
    {
        if ($event instanceof CognitiveSessionCompleted) {
            $this->auditService->record(
                $event->session->user,
                'session_completed',
                'cognitive_session',
                $event->session->id,
                ['score' => $event->session->overall_score, 'accuracy' => $event->session->accuracy]
            );
        } elseif ($event instanceof ConsentUpdated) {
            $this->auditService->record(
                $event->consent->user,
                'consent_updated',
                'privacy_consent',
                $event->consent->id,
                ['purpose' => $event->consent->purpose, 'version' => $event->consent->consent_version]
            );
        }
    }
}
