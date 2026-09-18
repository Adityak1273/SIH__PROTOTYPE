<?php

namespace App\Enums;

enum CognitiveDomain: string
{
    case Overall = 'overall';
    case Memory = 'memory';
    case Attention = 'attention';
    case Executive = 'executive';
    case Visuospatial = 'visuospatial';
    case Routine = 'routine';
    case Language = 'language';
    case Orientation = 'orientation';
}
