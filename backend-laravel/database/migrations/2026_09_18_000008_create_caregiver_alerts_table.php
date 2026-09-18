<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caregiver_alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('caregiver_id')->constrained('users')->cascadeOnDelete();
            $table->string('type'); // reminder_missed, performance_change, sync_issue, care_note
            $table->string('severity')->default('info'); // info, attention, urgent
            $table->string('title');
            $table->text('message');
            $table->foreignUuid('source_session_id')->nullable()->constrained('cognitive_sessions')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            $table->index(['caregiver_id', 'created_at']);
            $table->index(['patient_id', 'acknowledged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caregiver_alerts');
    }
};
