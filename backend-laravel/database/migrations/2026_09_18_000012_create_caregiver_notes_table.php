<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caregiver_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('caregiver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->string('category')->default('observation'); // observation, routine, medical_check, mood
            $table->text('content');
            $table->date('note_date');
            $table->timestamps();

            $table->index(['patient_id', 'created_at']);
            $table->index(['caregiver_id', 'patient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caregiver_notes');
    }
};
