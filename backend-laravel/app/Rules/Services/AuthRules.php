<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;

class AuthRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'AUTH_ATTEMPT',
        'AUTH_SUCCESS',
        'AUTH_FAILURE',
        'AUTH_LOGOUT',
        'SESSION_TIMEOUT',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'AUTH_ATTEMPT':
                $failedAttempts = (int) ($payload['consecutive_failed_attempts'] ?? 0);
                if ($failedAttempts >= 5) {
                    return RuleDecision::deny(
                        'lockout',
                        'TOO_MANY_FAILED_ATTEMPTS',
                        ['auth' => 'unauthenticated'],
                        ['lockout_seconds' => 300]
                    );
                }
                return RuleDecision::allow('proceed_with_auth');

            case 'AUTH_SUCCESS':
                $profileComplete = (bool) ($payload['profileComplete'] ?? false);
                $role = $payload['role'] ?? 'patient';

                if (!$profileComplete) {
                    return RuleDecision::allow(
                        'redirect',
                        'PROFILE_INCOMPLETE',
                        ['auth' => 'authenticated', 'role' => $role, 'profileComplete' => false],
                        ['route' => 'profile']
                    );
                }

                $destination = match ($role) {
                    'caregiver' => 'caregiver.dashboard',
                    'health_worker' => 'caregiver.dashboard',
                    'admin' => 'admin.dashboard',
                    default => 'patient.dashboard',
                };

                return RuleDecision::allow(
                    'redirect',
                    'AUTH_SUCCESSFUL',
                    ['auth' => 'authenticated', 'role' => $role, 'profileComplete' => true],
                    ['route' => $destination]
                );

            case 'AUTH_FAILURE':
                return RuleDecision::deny(
                    'retry',
                    'INVALID_CREDENTIALS',
                    ['auth' => 'unauthenticated'],
                    ['retry' => true]
                );

            case 'AUTH_LOGOUT':
            case 'SESSION_TIMEOUT':
                return RuleDecision::allow(
                    'redirect',
                    'SESSION_TERMINATED',
                    ['auth' => 'unauthenticated', 'role' => 'patient', 'game' => 'idle', 'voice' => 'idle'],
                    ['route' => 'login']
                );

            default:
                return RuleDecision::allow('observe');
        }
    }
}
