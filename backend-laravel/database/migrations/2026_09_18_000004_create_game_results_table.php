<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cognitive_session_id')->constrained('cognitive_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('game_key', 40); // sequence, stroop, house, pattern, spot
            $table->unsignedTinyInteger('trial_number'); // 1 to 15
            $table->boolean('is_correct');
            $table->decimal('response_time_seconds', 6, 3);
            $table->unsignedTinyInteger('difficulty_level')->default(2); // 1-10
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'game_key', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_results');
    }
};
