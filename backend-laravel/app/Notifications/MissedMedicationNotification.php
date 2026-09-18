<?php

namespace App\Notifications;

use App\Models\Reminder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MissedMedicationNotification extends Notification
{
    use Queueable;

    public function __construct(public Reminder $reminder)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Caregiver Notice: Scheduled Medication Reminder')
            ->line("A scheduled routine reminder was triggered for: {$this->reminder->title}")
            ->line("Scheduled time: {$this->reminder->reminder_time}")
            ->action('View Reminders', url('/caregiver/dashboard'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'reminder_id' => $this->reminder->id,
            'title' => $this->reminder->title,
            'kind' => $this->reminder->kind->value,
            'time' => $this->reminder->reminder_time,
        ];
    }
}
