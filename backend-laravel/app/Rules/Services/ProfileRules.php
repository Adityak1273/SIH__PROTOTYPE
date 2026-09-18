<?php

namespace App\Rules\Services;

use App\Rules\Contracts\RuleInterface;
use App\Rules\Engine\RuleDecision;
use App\Support\LanguageRegistry;

class ProfileRules implements RuleInterface
{
    public const SUPPORTED_EVENTS = [
        'PROFILE_UPDATE',
        'ROLE_ELEVATION_REQUEST',
        'LANGUAGE_SELECT',
    ];

    public function supports(string $event): bool
    {
        return in_array($event, self::SUPPORTED_EVENTS, true);
    }

    public function evaluate(string $event, array $payload, array $state): RuleDecision
    {
        switch ($event) {
            case 'ROLE_ELEVATION_REQUEST':
                $targetRole = $payload['target_role'] ?? 'patient';
                $currentRole = $state['role'] ?? 'patient';

                // Self-elevation from patient to caregiver/admin is strictly prohibited
                if ($currentRole === 'patient' && in_array($targetRole, ['caregiver', 'health_worker', 'admin'], true)) {
                    return RuleDecision::deny(
                        'reject_elevation',
                        'PATIENTS_CANNOT_SELF_ELEVATE_ROLE',
                        [],
                        ['current' => $currentRole, 'target' => $targetRole]
                    );
                }

                return RuleDecision::allow('approve_role_elevation', 'ROLE_PERMITTED');

            case 'LANGUAGE_SELECT':
                $lang = $payload['language'] ?? 'en-IN';
                if (!LanguageRegistry::isValid($lang)) {
                    return RuleDecision::deny(
                        'fallback_language',
                        'UNSUPPORTED_LANGUAGE_CODE',
                        [],
                        ['requested' => $lang, 'fallback' => 'en-IN']
                    );
                }

                return RuleDecision::allow(
                    'apply_language',
                    'LANGUAGE_SUPPORTED',
                    [],
                    ['language' => $lang]
                );

            case 'PROFILE_UPDATE':
                $dob = $payload['date_of_birth'] ?? null;
                if ($dob && strtotime($dob) > time()) {
                    return RuleDecision::deny(
                        'reject_update',
                        'DOB_CANNOT_BE_FUTURE',
                        [],
                        ['field' => 'date_of_birth']
                    );
                }

                $voicePref = $payload['voice_preference'] ?? 'default';
                if (!in_array($voicePref, ['default', 'slow', 'loud'], true)) {
                    return RuleDecision::deny(
                        'reject_update',
                        'INVALID_VOICE_PREFERENCE',
                        [],
                        ['field' => 'voice_preference']
                    );
                }

                return RuleDecision::allow('save_profile', 'PROFILE_VALIDATED');

            default:
                return RuleDecision::allow('observe');
        }
    }
}
