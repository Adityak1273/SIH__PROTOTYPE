<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class VoiceRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'VOICE_REQUEST',
        'VOICE_TRANSITION',
        'VOICE_MUTE_TOGGLE',
    ];

    protected array $allowedTransitions = [
        'idle' => ['listening', 'disabled'],
        'listening' => ['processing', 'idle', 'error'],
        'processing' => ['speaking', 'idle', 'error'],
        'speaking' => ['idle', 'listening', 'error'],
        'error' => ['idle', 'listening'],
        'disabled' => ['idle'],
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        $currentVoice = $state['voice'] ?? 'idle';
        $currentGame = $state['game'] ?? 'idle';

        switch ($event) {
            case 'VOICE_REQUEST':
                // Invariant from prototype: if game is actively running, voice hotword cannot interrupt
                if ($currentGame === 'running' && empty($payload['explicit_wake_tap'])) {
                    return RuleDecision::deny(
                        'use_explicit_wake',
                        'GAME_ACTIVE_REQUIRES_EXPLICIT_TAP',
                        [],
                        ['current_game' => $currentGame]
                    );
                }

                if ($currentVoice === 'disabled') {
                    return RuleDecision::deny('voice_disabled', 'VOICE_CURRENTLY_MUTED_OR_DISABLED');
                }

                return RuleDecision::allow(
                    'listen',
                    'VOICE_LISTENING_ALLOWED',
                    ['voice' => 'listening']
                );

            case 'VOICE_TRANSITION':
                $target = $payload['to'] ?? '';
                $valid = $this->allowedTransitions[$currentVoice] ?? [];

                if (!in_array($target, $valid, true)) {
                    return RuleDecision::deny(
                        'reject_voice_transition',
                        "INVALID_VOICE_TRANSITION_FROM_{$currentVoice}_TO_{$target}",
                        [],
                        ['from' => $currentVoice, 'to' => $target]
                    );
                }

                return RuleDecision::allow(
                    'apply_voice_state',
                    'VOICE_TRANSITION_PERMITTED',
                    ['voice' => $target]
                );

            case 'VOICE_MUTE_TOGGLE':
                $newVoiceState = ($currentVoice === 'disabled') ? 'idle' : 'disabled';
                return RuleDecision::allow(
                    'toggle_mute',
                    'VOICE_MUTE_TOGGLED',
                    ['voice' => $newVoiceState],
                    ['muted' => $newVoiceState === 'disabled']
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
