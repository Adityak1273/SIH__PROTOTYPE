<?php

namespace App\Listeners;

use App\Enums\AlertSeverity;
use App\Events\CognitiveSessionCompleted;
use App\Models\CaregiverAlert;
use App\Notifications\CaregiverPerformanceAlertNotification;
use Illuminate\Support\Str;

class DispatchCaregiverAlert
{
    public function handle(CognitiveSessionCompleted $event): void
    {
        $session = $event->session;
        $patient = $session->user;

        // If session accuracy drops significantly below 60%
        if ($session->accuracy < 0.60) {
            $links = $patient->linkedCaregivers()->where('status', 'active')->get();

            foreach ($links as $link) {
                $caregiver = $link->caregiver;

                $alert = CaregiverAlert::create([
                    'id' => (string) Str::uuid(),
                    'patient_id' => $patient->id,
                    'caregiver_id' => $caregiver->id,
                    'type' => 'performance_change',
                    'severity' => AlertSeverity::Attention,
                    'title' => 'Cognitive Training Performance Alert',
                    'message' => "Recent training accuracy was {$session->overall_score}%. This is a training metric only — not a clinical diagnosis.",
                    'source_session_id' => $session->id,
                ]);

                $caregiver->notify(new CaregiverPerformanceAlertNotification($alert));
            }
        }
    }
}
