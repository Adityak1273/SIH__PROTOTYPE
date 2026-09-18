<?php

use App\Http\Controllers\Api\V1\AdaptiveDifficultyController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClinicalIntelligenceController;
use App\Http\Controllers\Api\V1\CognitiveSessionController;
use App\Http\Controllers\Api\V1\DailyTaskController;
use App\Http\Controllers\Api\V1\MagicLinkController;
use App\Http\Controllers\Api\V1\MomoGatewayController;
use App\Http\Controllers\Api\V1\OfflineSyncController;
use App\Http\Controllers\Api\V1\ReminderController;
use App\Http\Controllers\Api\V1\RuleEngineController;
use App\Http\Controllers\Privacy\ConsentController;
use App\Http\Controllers\Privacy\DataRightsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public Authentication routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/magic-link', [MagicLinkController::class, 'sendLink']);
    Route::get('/auth/magic-link/verify/{user}', [MagicLinkController::class, 'verify'])->name('api.magic-link.verify');

    // Centralized Rule Engine (Direct Evaluation & State Inspection)
    Route::post('/rules/evaluate', [RuleEngineController::class, 'evaluate']);
    Route::get('/rules/state', [RuleEngineController::class, 'state']);

    // Authenticated API routes
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::get('/auth/user', [AuthController::class, 'user']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Offline-Sync Batch Endpoint (Idempotent Outbox Sync)
        Route::post('/sync/batch', [OfflineSyncController::class, 'syncBatch']);

        // Cognitive Sessions & Adaptive baselines (Protected from unrestricted admin access)
        Route::middleware(['no.admin.medical'])->group(function () {
            Route::apiResource('cognitive-sessions', CognitiveSessionController::class)->only(['index', 'store', 'show']);
            Route::post('/adaptive/recommendation', [AdaptiveDifficultyController::class, 'recommend']);
            Route::get('/adaptive/baselines', [AdaptiveDifficultyController::class, 'baselines']);

            // Routine Reminders & Daily Tasks
            Route::apiResource('reminders', ReminderController::class);
            Route::apiResource('daily-tasks', DailyTaskController::class)->only(['index', 'store', 'update']);

            // Clinical Intelligence & Report Structuring
            Route::post('/clinical/analyze', [ClinicalIntelligenceController::class, 'analyze']);
            Route::get('/clinical/profile', [ClinicalIntelligenceController::class, 'getProfile']);
        });

        // Momo Companion AI Gateway (Secure server-side proxy; API key never exposed to client)
        Route::prefix('companion')->group(function () {
            Route::post('/chat', [MomoGatewayController::class, 'chat']);
            Route::post('/explain-game', [MomoGatewayController::class, 'explainGame']);
            Route::post('/summarize-activity', [MomoGatewayController::class, 'summarizeActivity']);
        });

        // Privacy & Consent
        Route::get('/privacy/consents', [ConsentController::class, 'index']);
        Route::post('/privacy/consents', [ConsentController::class, 'store']);
        Route::post('/privacy/export', [DataRightsController::class, 'requestExport']);
        Route::delete('/privacy/purge', [DataRightsController::class, 'purgeAllData']);
    });
});
