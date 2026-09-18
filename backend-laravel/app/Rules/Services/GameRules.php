<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class GameRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'GAME_START_REQUEST',
        'GAME_TRANSITION',
        'GAME_PAUSE',
        'GAME_RESUME',
        'GAME_ABORT',
    ];

    /**
     * Strict state machine transitions ported from prototype rule-engine.js:L89-L99
     */
    protected array $allowedTransitions = [
        'idle' => ['ready'],
        'ready' => ['running', 'idle'],
        'running' => ['paused', 'completed', 'exited', 'interrupted'],
        'paused' => ['running', 'exited', 'interrupted'],
        'completed' => ['idle'],
        'exited' => ['idle'],
        'interrupted' => ['idle'],
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        $currentGameState = $state['game'] ?? 'idle';

        switch ($event) {
            case 'GAME_START_REQUEST':
                if ($currentGameState === 'running') {
                    return RuleDecision::deny(
                        'reject_start',
                        'GAME_ALREADY_RUNNING',
                        [],
                        ['current_state' => $currentGameState]
                    );
                }

                return RuleDecision::allow(
                    'start_session',
                    'GAME_STARTED',
                    ['game' => 'running', 'screen' => 'gameView', 'voice' => 'idle']
                );

            case 'GAME_TRANSITION':
                $target = $payload['to'] ?? '';
                $validTargets = $this->allowedTransitions[$currentGameState] ?? [];

                if (!in_array($target, $validTargets, true)) {
                    return RuleDecision::deny(
                        'reject_transition',
                        "INVALID_TRANSITION_FROM_{$currentGameState}_TO_{$target}",
                        [],
                        ['from' => $currentGameState, 'to' => $target]
                    );
                }

                $screenUpdate = match ($target) {
                    'running' => 'gameView',
                    'completed' => 'resultsView',
                    'idle', 'exited' => 'homeView',
                    default => $state['screen'] ?? 'homeView',
                };

                return RuleDecision::allow(
                    'apply_transition',
                    'TRANSITION_PERMITTED',
                    ['game' => $target, 'screen' => $screenUpdate],
                    ['from' => $currentGameState, 'to' => $target]
                );

            case 'GAME_PAUSE':
                if ($currentGameState !== 'running') {
                    return RuleDecision::deny('ignore_pause', 'CANNOT_PAUSE_NON_RUNNING_GAME');
                }
                return RuleDecision::allow('pause_game', 'GAME_PAUSED', ['game' => 'paused']);

            case 'GAME_RESUME':
                if ($currentGameState !== 'paused') {
                    return RuleDecision::deny('ignore_resume', 'GAME_NOT_PAUSED');
                }
                return RuleDecision::allow('resume_game', 'GAME_RESUMED', ['game' => 'running']);

            case 'GAME_ABORT':
                return RuleDecision::allow(
                    'abort_game',
                    'GAME_ABORTED_BY_USER',
                    ['game' => 'idle', 'screen' => 'homeView'],
                    ['preserve_partial_results' => true]
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
