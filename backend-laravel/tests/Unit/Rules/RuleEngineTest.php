<?php

namespace Tests\Unit\Rules;

use App\Rules\Engine\RuleDecision;
use App\Rules\Engine\RuleEngine;
use App\Rules\Services\DifficultyRules;
use App\Rules\Services\GameRules;
use App\Rules\Services\SafetyRules;
use App\Services\AuditLogService;
use PHPUnit\Framework\TestCase;

class RuleEngineTest extends TestCase
{
    protected RuleEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new RuleEngine(
            auditService: null, // unit test without database dependency
            ruleServices: [
                new GameRules(),
                new DifficultyRules(),
                new SafetyRules(),
            ]
        );
    }

    public function test_full_event_to_action_and_state_update_lifecycle(): void
    {
        $initialState = $this->engine->getState();
        $this->assertEquals('idle', $initialState['game']);
        $this->assertEquals('homeView', $initialState['screen']);

        // Dispatch GAME_START_REQUEST event
        $decision = $this->engine->dispatch('GAME_START_REQUEST', []);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('start_session', $decision->action);
        $this->assertEquals('GAME_STARTED', $decision->reason);

        // State update verification
        $updatedState = $this->engine->getState();
        $this->assertEquals('running', $updatedState['game']);
        $this->assertEquals('gameView', $updatedState['screen']);
    }

    public function test_ai_can_never_override_denied_rules(): void
    {
        // 1. Setup running game
        $this->engine->dispatch('GAME_START_REQUEST', []);

        // 2. AI attempts to start another game concurrently
        $aiPayload = [
            'source' => 'ai',
            'action' => 'force_start_second_game',
        ];

        $decision = $this->engine->dispatch('GAME_START_REQUEST', $aiPayload);

        // Assert that AI was strictly denied and override was prevented
        $this->assertFalse($decision->allowed);
        $this->assertStringContainsString('AI_OVERRIDE_PREVENTED', $decision->reason);
        $this->assertFalse($decision->isOverridableByAi);
        $this->assertTrue($decision->metadata['ai_attempted_override'] ?? false);
    }

    public function test_unregistered_event_defaults_to_safe_observe_action(): void
    {
        $decision = $this->engine->dispatch('UNKNOWN_ARBITRARY_EVENT', []);
        $this->assertTrue($decision->allowed);
        $this->assertEquals('observe', $decision->action);
        $this->assertEquals('NO_MATCHING_RULE_REGISTERED', $decision->reason);
    }
}
