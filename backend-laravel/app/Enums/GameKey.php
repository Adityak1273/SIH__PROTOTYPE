<?php

namespace App\Enums;

enum GameKey: string
{
    case Sequence = 'sequence';
    case Stroop = 'stroop';
    case House = 'house';
    case Pattern = 'pattern';
    case Spot = 'spot';

    // Cultural NER variant set
    case FamiliarMemory = 'familiar_memory';
    case FindObject = 'find_object';
    case SequenceRecall = 'sequence_recall';
    case PatternCompletion = 'pattern_completion';
    case LocalMemory = 'local_memory';

    public function title(): string
    {
        return match ($this) {
            self::Sequence => 'Sequence Memory',
            self::Stroop => 'Stroop Test',
            self::House => 'Around the House Sorting',
            self::Pattern => 'Pattern Recognition',
            self::Spot => 'Spot the Difference',
            self::FamiliarMemory => 'Familiar Object Memory',
            self::FindObject => 'Find the Object',
            self::SequenceRecall => 'Sequence Recall',
            self::PatternCompletion => 'Pattern Completion',
            self::LocalMemory => 'Local Object Memory',
        };
    }

    public function domain(): CognitiveDomain
    {
        return match ($this) {
            self::Sequence, self::FamiliarMemory, self::LocalMemory => CognitiveDomain::Memory,
            self::Stroop, self::FindObject => CognitiveDomain::Attention,
            self::House, self::SequenceRecall => CognitiveDomain::Executive,
            self::Pattern, self::PatternCompletion => CognitiveDomain::Executive,
            self::Spot => CognitiveDomain::Visuospatial,
        };
    }
}
