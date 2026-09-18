<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MagicLinkNotification extends Notification
{
    use Queueable;

    public function __construct(public string $url)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Cognitive Care NER Login Link')
            ->greeting("Hello {$notifiable->name},")
            ->line('Tap the button below to securely sign in to your Cognitive Care account.')
            ->action('Sign In to Cognitive Care', $this->url)
            ->line('This login link will expire in 20 minutes.')
            ->salutation('Warm regards, Momo and the Cognitive Care Team');
    }
}
