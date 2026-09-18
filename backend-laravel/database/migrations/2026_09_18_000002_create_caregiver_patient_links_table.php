<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caregiver_patient_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('caregiver_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('patient_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending, active, rejected, revoked
            $table->json('permissions')->nullable(); // can_manage_reminders, view_clinical_reports
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();

            $table->unique(['caregiver_user_id', 'patient_user_id']);
            $table->index(['patient_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caregiver_patient_links');
    }
};
