<?php

namespace App\Rules\Engine;

use App\Models\User;
use App\Rules\Contracts\RuleInterface;
use App\Services\AuditLogService;
use InvalidArgumentException;

class RuleEngine
{
    /** @var array<string, RuleInterface> */
    protected array $rules = [];

    protected array $state = [
        'screen' => 'homeView',
        'auth' => 'unauthenticated',
        'profileComplete' => false,
        'role' => 'patient',
        'game' => 'idle', // idle, ready, running, paused, completed, exited, interrupted
        'voice' => 'idle', // idle, listening, processing, speaking, error, disabled
        'network' => 'online', // online, offline
        'fatigue' => 0.0,
        'consecutiveFailures' => 0,
        'consecutiveSuccesses' => 0,
        'lastDifficulty' => 2,
    ];

    public function __construct(
        protected ?AuditLogService $auditService = null,
        iterable $ruleServices = []
    ) {
        foreach ($ruleServices as $service) {
            if ($service instanceof RuleInterface) {
                $this->registerRule($service);
            }
        }
    }

    public function registerRule(RuleInterface $rule): self
    {
        $this->rules[get_class($rule)] = $rule;
        return $this;
    }

    public function getState(): array
    {
        return $this->state;
    }

    public function setState(array $patch): array
    {
        $this->state = array_merge($this->state, $patch);
        return $this->state;
    }

    /**
     * Primary Orchestrator Flow:
     * EVENT -> RULE EVALUATION -> ACTION -> STATE UPDATE -> AUDIT LOG
     */
    public function dispatch(string $event, array $payload = [], ?User $user = null): RuleDecision
    {
        // 1. RULE EVALUATION
        $matchedRule = null;
        foreach ($this->rules as $rule) {
            if ($rule->supports($event)) {
                $matchedRule = $rule;
                break;
            }
        }

        if (!$matchedRule) {
            $decision = RuleDecision::allow('observe', 'NO_MATCHING_RULE_REGISTERED', [], ['event' => $event]);
        } else {
            $decision = $matchedRule->evaluate($event, $payload, $this->state);
        }

        // 2. ENFORCE AI INVARIANT: AI CAN NEVER OVERRIDE RULES
        if (isset($payload['source']) && strtolower((string)$payload['source']) === 'ai') {
            if (!$decision->allowed) {
                // AI cannot bypass denial
                $decision = RuleDecision::deny(
                    $decision->action,
                    'AI_OVERRIDE_PREVENTED: ' . $decision->reason,
                    [],
                    array_merge($decision->metadata, ['ai_attempted_override' => true])
                );
            }
        }

        // 3. STATE UPDATE
        if (!empty($decision->stateUpdates)) {
            $this->setState($decision->stateUpdates);
        }

        // 4. AUDIT LOG
        if ($decision->requiresAudit && $this->auditService) {
            try {
                $this->auditService->record(
                    $user,
                    'rule_evaluated:' . $event,
                    'rule_decision',
                    $decision->action,
                    [
                        'decision' => $decision->toArray(),
                        'payload' => $payload,
                        'state_after' => $this->state,
                    ]
                );
            } catch (\Throwable $e) {
                // Keep evaluation non-blocking if database log fails
            }
        }

        return $decision;
    }
}
