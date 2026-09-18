<?php

namespace Tests\Unit\Rules;

use App\Rules\Services\VoiceRules;
use PHPUnit\Framework\TestCase;

class VoiceRulesTest extends TestCase
{
    protected VoiceRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new VoiceRules();
    }

    public function test_voice_request_denied_during_active_game_without_explicit_tap(): void
    {
        $payload = ['explicit_wake_tap' => false];
        $state = ['game' => 'running', 'voice' => 'idle'];

        $decision = $this->rules->evaluate('VOICE_REQUEST', $payload, $state);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('use_explicit_wake', $decision->action);
        $this->assertEquals('GAME_ACTIVE_REQUIRES_EXPLICIT_TAP', $decision->reason);
    }

    public function test_voice_request_allowed_during_game_if_explicit_tap_provided(): void
    {
        $payload = ['explicit_wake_tap' => true];
        $state = ['game' => 'running', 'voice' => 'idle'];

        $decision = $this->rules->evaluate('VOICE_REQUEST', $payload, $state);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('listen', $decision->action);
        $this->assertEquals('listening', $decision->stateUpdates['voice']);
    }

    public function test_voice_mute_toggle_switches_between_idle_and_disabled(): void
    {
        $decision1 = $this->rules->evaluate('VOICE_MUTE_TOGGLE', [], ['voice' => 'idle']);
        $this->assertEquals('disabled', $decision1->stateUpdates['voice']);

        $decision2 = $this->rules->evaluate('VOICE_MUTE_TOGGLE', [], ['voice' => 'disabled']);
        $this->assertEquals('idle', $decision2->stateUpdates['voice']);
    }

    public function test_invalid_voice_transition_is_rejected(): void
    {
        // Listening to speaking directly is invalid (must go through processing)
        $payload = ['to' => 'speaking'];
        $decision = $this->rules->evaluate('VOICE_TRANSITION', $payload, ['voice' => 'listening']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('reject_voice_transition', $decision->action);
    }
}
