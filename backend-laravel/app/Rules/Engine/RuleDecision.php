<?php

namespace App\Rules\Engine;

class RuleDecision
{
    public function __construct(
        public readonly bool $allowed,
        public readonly string $action,
        public readonly string $reason,
        public readonly array $stateUpdates = [],
        public readonly array $metadata = [],
        public readonly bool $isOverridableByAi = false, // AI CAN NEVER OVERRIDE RULES
        public readonly bool $requiresAudit = true
    ) {
    }

    public static function allow(string $action, string $reason = 'RULE_PERMITTED', array $stateUpdates = [], array $metadata = []): self
    {
        return new self(
            allowed: true,
            action: $action,
            reason: $reason,
            stateUpdates: $stateUpdates,
            metadata: $metadata,
            isOverridableByAi: false,
            requiresAudit: true
        );
    }

    public static function deny(string $action, string $reason = 'RULE_DENIED', array $stateUpdates = [], array $metadata = []): self
    {
        return new self(
            allowed: false,
            action: $action,
            reason: $reason,
            stateUpdates: $stateUpdates,
            metadata: $metadata,
            isOverridableByAi: false,
            requiresAudit: true
        );
    }

    public function toArray(): array
    {
        return [
            'allowed' => $this->allowed,
            'action' => $this->action,
            'reason' => $this->reason,
            'state_updates' => $this->stateUpdates,
            'metadata' => $this->metadata,
            'is_overridable_by_ai' => $this->isOverridableByAi,
            'requires_audit' => $this->requiresAudit,
        ];
    }
}
