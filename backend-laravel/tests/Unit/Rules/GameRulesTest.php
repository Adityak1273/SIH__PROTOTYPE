<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\GameRules;
use PHPUnit\Framework\TestCase;

class GameRulesTest extends TestCase
{
    protected GameRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new GameRules();
    }

    public function test_starting_game_when_idle_is_permitted(): void
    {
        $decision = $this->rules->evaluate('GAME_START_REQUEST', [], ['game' => 'idle']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('start_session', $decision->action);
        $this->assertEquals('running', $decision->stateUpdates['game']);
        $this->assertEquals('gameView', $decision->stateUpdates['screen']);
    }

    public function test_starting_game_when_already_running_is_denied(): void
    {
        $decision = $this->rules->evaluate('GAME_START_REQUEST', [], ['game' => 'running']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('reject_start', $decision->action);
        $this->assertEquals('GAME_ALREADY_RUNNING', $decision->reason);
    }

    public function test_invalid_state_transition_is_rejected(): void
    {
        // Jumping directly from idle to completed is invalid
        $payload = ['to' => 'completed'];
        $decision = $this->rules->evaluate('GAME_TRANSITION', $payload, ['game' => 'idle']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('reject_transition', $decision->action);
        $this->assertStringContainsString('INVALID_TRANSITION', $decision->reason);
    }

    public function test_pause_and_resume_transitions_are_permitted_in_running_state(): void
    {
        $pause = $this->rules->evaluate('GAME_PAUSE', [], ['game' => 'running']);
        $this->assertTrue($pause->allowed);
        $this->assertEquals('paused', $pause->stateUpdates['game']);

        $resume = $this->rules->evaluate('GAME_RESUME', [], ['game' => 'paused']);
        $this->assertTrue($resume->allowed);
        $this->assertEquals('running', $resume->stateUpdates['game']);
    }

    public function test_game_completion_transitions_screen_to_results_view(): void
    {
        $payload = ['to' => 'completed'];
        $decision = $this->rules->evaluate('GAME_TRANSITION', $payload, ['game' => 'running']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('resultsView', $decision->stateUpdates['screen']);
        $this->assertEquals('completed', $decision->stateUpdates['game']);
    }
}
