<?php

namespace TestsUnitRules;

use AppRulesServicesNavigationRules;
use PHPUnitFrameworkTestCase;

class NavigationRulesTest extends TestCase
{
    protected NavigationRules $rules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->rules = new NavigationRules();
    }

    public function test_navigating_away_from_active_game_without_confirmation_is_denied(): void
    {
        $decision = $this->rules->evaluate('NAV_REQUEST', ['to' => 'HOME'], ['navState' => 'ACTIVE_GAME']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('NAV-GAME-001', $decision->reason);
        $this->assertEquals('require_exit_confirmation', $decision->action);
    }

    public function test_navigating_from_active_game_to_modal_is_permitted(): void
    {
        $decision = $this->rules->evaluate('NAV_REQUEST', ['to' => 'MODAL'], ['navState' => 'ACTIVE_GAME']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('NAV-STATE-001', $decision->reason);
    }

    public function test_navigating_from_active_game_with_confirmed_exit_is_permitted(): void
    {
        $decision = $this->rules->evaluate('NAV_REQUEST', ['to' => 'HOME', 'confirmed_exit' => true], ['navState' => 'ACTIVE_GAME']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('NAV-STATE-001', $decision->reason);
    }

    public function test_back_button_from_home_root_screen_is_denied(): void
    {
        $decision = $this->rules->evaluate('NAV_REQUEST', ['to' => 'BACK'], ['navState' => 'HOME']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('NAV-HOME-001', $decision->reason);
        $this->assertEquals('stay_home', $decision->action);
    }

    public function test_game_exit_request_triggers_two_button_confirmation_dialog(): void
    {
        $decision = $this->rules->evaluate('GAME_EXIT_REQUEST', [], ['navState' => 'ACTIVE_GAME']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('NAV-GAME-002', $decision->reason);
        $this->assertEquals('Exit this game?', $decision->metadata['title']);
        $this->assertEquals('Continue Game', $decision->metadata['primary_action']);
        $this->assertEquals('Exit Game', $decision->metadata['secondary_action']);
    }

    public function test_game_exit_confirm_cleanly_resets_session_to_home(): void
    {
        $decision = $this->rules->evaluate('GAME_EXIT_CONFIRM', [], ['navState' => 'ACTIVE_GAME']);

        $this->assertTrue($decision->allowed);
        $this->assertEquals('EXIT-003', $decision->reason);
        $this->assertEquals('HOME', $decision->stateUpdates['navState']);
        $this->assertEquals('idle', $decision->stateUpdates['game']);
    }

    public function test_scrim_dismiss_on_critical_modal_is_prevented(): void
    {
        $decision = $this->rules->evaluate('MODAL_DISMISS_REQUEST', ['is_scrim' => true, 'is_critical' => true], ['navState' => 'MODAL']);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('NAV-MODAL-001', $decision->reason);
        $this->assertEquals('prevent_scrim_dismiss', $decision->action);
    }
}
