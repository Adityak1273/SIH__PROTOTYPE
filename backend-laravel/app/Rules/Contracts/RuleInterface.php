<?php

namespace App\Rules\Contracts;

use App\Rules\Engine\RuleDecision;

interface RuleInterface
{
    /**
     * Determines if this rule service handles the given event.
     */
    public function supports(string $event): bool;

    /**
     * Deterministically evaluates the event against domain policies.
     */
    public function evaluate(string $event, array $payload, array $state): RuleDecision;
}
