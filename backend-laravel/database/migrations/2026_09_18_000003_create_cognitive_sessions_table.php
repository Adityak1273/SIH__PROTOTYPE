<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cognitive_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('client_session_id')->unique(); // Idempotency key from client outbox
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('session_type')->default('five_game_continuous');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedTinyInteger('overall_score')->default(0); // 0-100%
            $table->decimal('accuracy', 5, 4)->default(0.0000); // 0.0000 - 1.0000
            $table->decimal('avg_response_time_seconds', 6, 2)->default(0.00);
            $table->unsignedTinyInteger('games_completed')->default(0); // 0-5
            $table->json('game_order'); // ['sequence','stroop','house','pattern','spot']
            $table->string('sync_status')->default('synced');
            $table->timestamps();

            $table->index(['user_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cognitive_sessions');
    }
};
