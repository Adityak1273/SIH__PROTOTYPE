<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('client_id')->nullable()->index(); // stable ID from client
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->time('reminder_time');
            $table->string('repeat_rule')->default('daily'); // daily, once
            $table->string('kind')->default('general'); // medicine, hydration, appointment, daily_activity, general
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'active', 'reminder_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
