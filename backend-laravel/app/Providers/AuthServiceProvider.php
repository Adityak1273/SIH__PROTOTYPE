<?php

namespace App\Providers;

use App\Models\CaregiverAlert;
use App\Models\ClinicalReport;
use App\Models\CognitiveSession;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserProfile;
use App\Policies\CaregiverAlertPolicy;
use App\Policies\CaregiverPatientPolicy;
use App\Policies\ClinicalReportPolicy;
use App\Policies\CognitiveSessionPolicy;
use App\Policies\ReminderPolicy;
use App\Policies\UserProfilePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     */
    protected $policies = [
        CognitiveSession::class => CognitiveSessionPolicy::class,
        Reminder::class => ReminderPolicy::class,
        ClinicalReport::class => ClinicalReportPolicy::class,
        UserProfile::class => UserProfilePolicy::class,
        User::class => CaregiverPatientPolicy::class,
        CaregiverAlert::class => CaregiverAlertPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // System Admin ability: Can manage system configurations and audit logs
        Gate::define('manage-system', function (User $user) {
            return $user->isAdmin();
        });

        // Strict Medical Data Barrier: Zero-trust guard preventing default admin bypass
        // NOTE: We intentionally do NOT define a Gate::before() allowing admins universal bypass.
    }
}
