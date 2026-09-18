<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\SyncRules;
use PHPUnit\Framework\TestCase;

class SyncRulesTest extends TestCase
{
    protected SyncRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new SyncRules();
    }

    public function test_offline_network_state_directs_to_local_queue(): void
    {
        $payload = ['online' => false];
        $decision = $this->rules->evaluate('NETWORK_CHANGE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('queue_local', $decision->action);
        $this->assertEquals('offline', $decision->stateUpdates['network']);
    }

    public function test_online_network_state_triggers_sync_retry(): void
    {
        $payload = ['online' => true];
        $decision = $this->rules->evaluate('NETWORK_CHANGE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('retry_sync', $decision->action);
        $this->assertEquals('online', $decision->stateUpdates['network']);
    }

    public function test_flushing_outbox_while_offline_is_denied(): void
    {
        $decision = $this->rules->evaluate('OUTBOX_FLUSH_REQUEST', [], ['network' => 'offline']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('hold_in_outbox', $decision->action);
        $this->assertEquals('CANNOT_FLUSH_WHILE_OFFLINE', $decision->reason);
    }

    public function test_duplicate_client_session_id_is_ignored_idempotently(): void
    {
        $payload = [
            'entity_type' => 'session',
            'is_duplicate' => true,
        ];

        $decision = $this->rules->evaluate('SYNC_CONFLICT_EVALUATE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('ignore_duplicate', $decision->action);
        $this->assertTrue($decision->metadata['deduplicated']);
    }

    public function test_client_is_authoritative_for_offline_game_sessions(): void
    {
        $payload = [
            'entity_type' => 'session',
            'is_duplicate' => false,
        ];

        $decision = $this->rules->evaluate('SYNC_CONFLICT_EVALUATE', $payload, []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('client_authoritative', $decision->metadata['authority']);
    }
}
