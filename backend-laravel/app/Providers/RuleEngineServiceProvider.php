<?php

namespace App\Providers;

use App\Rules\Engine\RuleEngine;
use App\Rules\Services\AccessibilityRules;
use App\Rules\Services\AuthRules;
use App\Rules\Services\CaregiverRules;
use App\Rules\Services\DifficultyRules;
use App\Rules\Services\GameRules;
use App\Rules\Services\NotificationRules;
use App\Rules\Services\ProfileRules;
use App\Rules\Services\ReminderRules;
use App\Rules\Services\SafetyRules;
use App\Rules\Services\SyncRules;
use App\Rules\Services\VoiceRules;
use App\Services\AuditLogService;
use Illuminate\Support\ServiceProvider;

class RuleEngineServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(RuleEngine::class, function ($app) {
            $engine = new RuleEngine(
                auditService: $app->make(AuditLogService::class)
            );

            // Register all 11 domain rule services
            $engine->registerRule(new AuthRules());
            $engine->registerRule(new ProfileRules());
            $engine->registerRule(new GameRules());
            $engine->registerRule(new DifficultyRules());
            $engine->registerRule(new VoiceRules());
            $engine->registerRule(new ReminderRules());
            $engine->registerRule(new SyncRules());
            $engine->registerRule(new SafetyRules());
            $engine->registerRule(new AccessibilityRules());
            $engine->registerRule(new CaregiverRules());
            $engine->registerRule(new NotificationRules());

            return $engine;
        });
    }
}
