<?php

namespace App\Enums;

enum LinkStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Rejected = 'rejected';
    case Revoked = 'revoked';
}
