<?php

namespace AppRulesServices;

use AppRulesContractsRuleInterface;
use AppRulesEngineRuleDecision;

class NavigationRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'NAV_REQUEST',
        'GAME_EXIT_REQUEST',
        'GAME_EXIT_CONFIRM',
        'MODAL_DISMISS_REQUEST',
        'NAV_BACK_REQUEST',
    ];

    /**
     * Strict navigation state transitions:
     * HOME, SECONDARY_SCREEN, DETAIL_SCREEN, FORM_SCREEN, MODAL, ACTIVE_GAME, GAME_RESULTS, AUTH, DASHBOARD
     */
    protected array $allowedTransitions = [
        'HOME' => ['ACTIVE_GAME', 'SECONDARY_SCREEN', 'FORM_SCREEN', 'DASHBOARD', 'AUTH', 'MODAL'],
        'SECONDARY_SCREEN' => ['HOME', 'DETAIL_SCREEN', 'FORM_SCREEN', 'MODAL'],
        'DETAIL_SCREEN' => ['SECONDARY_SCREEN', 'MODAL'],
        'FORM_SCREEN' => ['HOME', 'SECONDARY_SCREEN', 'MODAL'],
        'MODAL' => ['HOME', 'ACTIVE_GAME', 'SECONDARY_SCREEN', 'DETAIL_SCREEN', 'FORM_SCREEN', 'GAME_RESULTS', 'AUTH', 'DASHBOARD'],
        'ACTIVE_GAME' => ['MODAL', 'GAME_RESULTS'],
        'GAME_RESULTS' => ['HOME', 'ACTIVE_GAME'],
        'AUTH' => ['HOME', 'DASHBOARD', 'FORM_SCREEN'],
        'DASHBOARD' => ['HOME', 'DETAIL_SCREEN', 'MODAL'],
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        $currentNav = $state['navState'] ?? ($state['game'] === 'running' ? 'ACTIVE_GAME' : 'HOME');

        switch ($event) {
            case 'NAV_REQUEST':
                $target = $payload['to'] ?? '';
                $confirmedExit = $payload['confirmed_exit'] ?? false;

                // Rule NAV-GAME-001: Active game controls lock
                if ($currentNav === 'ACTIVE_GAME' && $target !== 'MODAL' && !$confirmedExit) {
                    return RuleDecision::deny(
                        'require_exit_confirmation',
                        'NAV-GAME-001',
                        [],
                        [
                            'reason' => 'Active cognitive game cannot be abandoned without confirmation.',
                            'required_action' => 'show_exit_confirmation',
                            'rule' => 'NAV-GAME-001',
                        ]
                    );
                }

                // Rule NAV-HOME-001: Home screen isolation (no back button on home)
                if ($currentNav === 'HOME' && $target === 'BACK') {
                    return RuleDecision::deny(
                        'stay_home',
                        'NAV-HOME-001',
                        [],
                        [
                            'reason' => 'Home view is the root screen. Back navigation is disabled.',
                            'rule' => 'NAV-HOME-001',
                        ]
                    );
                }

                $valid = $this->allowedTransitions[$currentNav] ?? [];
                if (!in_array($target, $valid, true)) {
                    return RuleDecision::deny(
                        'reject_transition',
                        'NAV-STATE-001',
                        [],
                        [
                            'reason' => "Invalid screen transition from {$currentNav} to {$target}.",
                            'rule' => 'NAV-STATE-001',
                        ]
                    );
                }

                return RuleDecision::allow(
                    'navigate',
                    'NAV-STATE-001',
                    ['navState' => $target]
                );

            case 'GAME_EXIT_REQUEST':
                // Rule NAV-GAME-002: Game Exit Confirmation Modal
                return RuleDecision::allow(
                    'show_exit_confirmation',
                    'NAV-GAME-002',
                    [],
                    [
                        'title' => 'Exit this game?',
                        'message' => 'Your current game progress may not be saved.',
                        'primary_action' => 'Continue Game',
                        'secondary_action' => 'Exit Game',
                        'rule' => 'NAV-GAME-002',
                    ]
                );

            case 'GAME_EXIT_CONFIRM':
                // Rule EXIT-003: Clean session reset
                return RuleDecision::allow(
                    'clean_reset_and_route_home',
                    'EXIT-003',
                    [
                        'navState' => 'HOME',
                        'game' => 'idle',
                        'voice' => 'idle',
                    ],
                    [
                        'message' => 'Session cleanly terminated. Returning to home view.',
                        'rule' => 'EXIT-003',
                    ]
                );

            case 'MODAL_DISMISS_REQUEST':
                $isScrim = $payload['is_scrim'] ?? false;
                $isCritical = $payload['is_critical'] ?? false;

                // Rule NAV-MODAL-001: Critical modal scrim lock
                if ($isScrim && $isCritical) {
                    return RuleDecision::deny(
                        'prevent_scrim_dismiss',
                        'NAV-MODAL-001',
                        [],
                        [
                            'reason' => 'Critical confirmation dialogs require explicit button choice.',
                            'rule' => 'NAV-MODAL-001',
                        ]
                    );
                }

                return RuleDecision::allow('dismiss_modal', 'NAV-MODAL-001');

            case 'NAV_BACK_REQUEST':
                if ($currentNav === 'DETAIL_SCREEN') {
                    return RuleDecision::allow('return_to_parent', 'NAV-BACK-001', ['navState' => 'SECONDARY_SCREEN']);
                }
                if ($currentNav === 'SECONDARY_SCREEN' || $currentNav === 'FORM_SCREEN') {
                    return RuleDecision::allow('return_to_home', 'NAV-BACK-001', ['navState' => 'HOME']);
                }
                return RuleDecision::deny('back_unavailable', 'NAV-BACK-001');

            default:
                return RuleDecision::deny('unsupported_event', 'NAV_UNSUPPORTED');
        }
    }
}
