<?php

namespace App\Enums;

enum AlertSeverity: string
{
    case Info = 'info';
    case Attention = 'attention';
    case Urgent = 'urgent';
}
