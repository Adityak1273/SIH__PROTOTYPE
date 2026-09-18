<?php

namespace App\Events;

use App\Models\PrivacyConsent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConsentUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(public PrivacyConsent $consent)
    {
    }
}
