<?php

namespace App\Events;

use App\Models\CognitiveSession;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CognitiveSessionCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(public CognitiveSession $session)
    {
    }
}
