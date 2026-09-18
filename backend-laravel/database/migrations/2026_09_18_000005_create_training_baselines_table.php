<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_baselines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('domain', 30); // overall, memory, attention, executive, visuospatial, pattern
            $table->decimal('score', 5, 2); // 0.00 to 100.00
            $table->unsignedInteger('sample_count')->default(1);
            $table->timestamp('captured_at');
            $table->timestamps();

            $table->index(['user_id', 'domain', 'captured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_baselines');
    }
};
