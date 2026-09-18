<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Expand users table with login ID / username
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('name');
            }
        });

        // 2. Expand user_profiles with 6 structured domains
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'preferred_name')) {
                $table->string('preferred_name')->nullable()->after('full_name');
            }
            if (!Schema::hasColumn('user_profiles', 'age')) {
                $table->unsignedTinyInteger('age')->nullable()->after('date_of_birth');
            }
            if (!Schema::hasColumn('user_profiles', 'phone')) {
                $table->string('phone')->nullable()->after('gender');
            }
            if (!Schema::hasColumn('user_profiles', 'email')) {
                $table->string('email')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('user_profiles', 'address')) {
                $table->text('address')->nullable()->after('email');
            }
            if (!Schema::hasColumn('user_profiles', 'city')) {
                $table->string('city')->nullable()->after('address');
            }
            if (!Schema::hasColumn('user_profiles', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('user_profiles', 'country')) {
                $table->string('country')->default('India')->after('state');
            }
            if (!Schema::hasColumn('user_profiles', 'additional_languages')) {
                $table->json('additional_languages')->nullable()->after('preferred_language');
            }
            if (!Schema::hasColumn('user_profiles', 'caregiver_info')) {
                $table->json('caregiver_info')->nullable()->after('emergency_relationship');
            }
            if (!Schema::hasColumn('user_profiles', 'health_background')) {
                $table->json('health_background')->nullable()->after('caregiver_info');
            }
            if (!Schema::hasColumn('user_profiles', 'daily_life_background')) {
                $table->json('daily_life_background')->nullable()->after('health_background');
            }
            if (!Schema::hasColumn('user_profiles', 'accessibility_settings')) {
                $table->json('accessibility_settings')->nullable()->after('daily_life_background');
            }
            if (!Schema::hasColumn('user_profiles', 'privacy_preferences')) {
                $table->json('privacy_preferences')->nullable()->after('accessibility_settings');
            }
            if (!Schema::hasColumn('user_profiles', 'onboarding_step')) {
                $table->unsignedTinyInteger('onboarding_step')->default(1)->after('profile_complete');
            }
            if (!Schema::hasColumn('user_profiles', 'profile_completion_pct')) {
                $table->unsignedTinyInteger('profile_completion_pct')->default(20)->after('onboarding_step');
            }
        });

        // 3. Expand clinical_reports with extracted entity confirmation & source metadata
        Schema::table('clinical_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('clinical_reports', 'original_filename')) {
                $table->string('original_filename')->nullable()->after('report_title');
            }
            if (!Schema::hasColumn('clinical_reports', 'extracted_text')) {
                $table->longText('extracted_text')->nullable()->after('original_filename');
            }
            if (!Schema::hasColumn('clinical_reports', 'extracted_entities')) {
                $table->json('extracted_entities')->nullable()->after('analysis');
            }
            if (!Schema::hasColumn('clinical_reports', 'confirmed_entities')) {
                $table->json('confirmed_entities')->nullable()->after('extracted_entities');
            }
            if (!Schema::hasColumn('clinical_reports', 'confirmation_status')) {
                $table->string('confirmation_status')->default('pending_confirmation')->after('confirmed_entities');
            }
            if (!Schema::hasColumn('clinical_reports', 'source_attribution')) {
                $table->string('source_attribution')->default('doctor_report')->after('confirmation_status');
            }
            if (!Schema::hasColumn('clinical_reports', 'report_date')) {
                $table->date('report_date')->nullable()->after('source_attribution');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clinical_reports', function (Blueprint $table) {
            $table->dropColumn([
                'original_filename',
                'extracted_text',
                'extracted_entities',
                'confirmed_entities',
                'confirmation_status',
                'source_attribution',
                'report_date',
            ]);
        });

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'preferred_name',
                'age',
                'phone',
                'email',
                'address',
                'city',
                'state',
                'country',
                'additional_languages',
                'caregiver_info',
                'health_background',
                'daily_life_background',
                'accessibility_settings',
                'privacy_preferences',
                'onboarding_step',
                'profile_completion_pct',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
