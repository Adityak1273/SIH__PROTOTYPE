<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('full_name')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['Female', 'Male', 'Other', 'Prefer not to say'])->nullable();
            $table->string('emergency_contact')->nullable();
            $table->string('emergency_relationship')->nullable();
            $table->string('momo_name')->default('Momo');
            $table->enum('voice_preference', ['default', 'slow', 'loud'])->default('default');
            $table->string('region')->default('Assam');
            $table->string('preferred_language')->default('en-IN');
            $table->string('accessibility_mode')->default('standard');
            $table->string('avatar_path')->nullable();
            $table->boolean('profile_complete')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'preferred_language']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
