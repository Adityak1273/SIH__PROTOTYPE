<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class SyncRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'NETWORK_CHANGE',
        'SYNC_CONFLICT_EVALUATE',
        'OUTBOX_FLUSH_REQUEST',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'NETWORK_CHANGE':
                $isOnline = (bool) ($payload['online'] ?? true);
                return RuleDecision::allow(
                    $isOnline ? 'retry_sync' : 'queue_local',
                    $isOnline ? 'NETWORK_ONLINE' : 'NETWORK_OFFLINE',
                    ['network' => $isOnline ? 'online' : 'offline']
                );

            case 'OUTBOX_FLUSH_REQUEST':
                if (($state['network'] ?? 'online') === 'offline') {
                    return RuleDecision::deny(
                        'hold_in_outbox',
                        'CANNOT_FLUSH_WHILE_OFFLINE'
                    );
                }

                return RuleDecision::allow(
                    'flush_outbox',
                    'OUTBOX_FLUSH_AUTHORIZED'
                );

            case 'SYNC_CONFLICT_EVALUATE':
                $entityType = $payload['entity_type'] ?? 'session';
                $isDuplicate = (bool) ($payload['is_duplicate'] ?? false);

                if ($isDuplicate) {
                    return RuleDecision::allow(
                        'ignore_duplicate',
                        'CLIENT_SESSION_ID_ALREADY_INGESTED',
                        [],
                        ['deduplicated' => true]
                    );
                }

                // Authority rule: client is authoritative for offline game results, server for permissions
                $authority = match ($entityType) {
                    'session', 'trial', 'daily_task' => 'client_authoritative',
                    'role', 'caregiver_link', 'consent' => 'server_authoritative',
                    default => 'server_authoritative',
                };

                return RuleDecision::allow(
                    'resolve_conflict',
                    'AUTHORITY_DETERMINED',
                    [],
                    ['authority' => $authority]
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
