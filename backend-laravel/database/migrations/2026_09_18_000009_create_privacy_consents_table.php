<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('privacy_consents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('consent_version', 30);
            $table->string('purpose'); // core_app, analytics, notifications
            $table->timestamp('accepted_at');
            $table->timestamp('revoked_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'consent_version', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('privacy_consents');
    }
};
