<?php

namespace App\Notifications;

use App\Models\CaregiverAlert;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CaregiverPerformanceAlertNotification extends Notification
{
    use Queueable;

    public function __construct(public CaregiverAlert $alert)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Cognitive Care Alert: Patient Activity Update')
            ->line($this->alert->title)
            ->line($this->alert->message)
            ->action('Open Caregiver Portal', url('/caregiver/dashboard'))
            ->line('Note: Cognitive training scores represent training progress only and do not establish a medical diagnosis.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'alert_id' => $this->alert->id,
            'title' => $this->alert->title,
            'message' => $this->alert->message,
            'severity' => $this->alert->severity->value,
            'patient_id' => $this->alert->patient_id,
        ];
    }
}
