<?php

namespace App\Enums;

enum NotificationEnabledStatus: string
{
    case Force = 'force';
    case Never = 'never';
    case ChoiceOn = 'choice_on';
    case ChoiceOff = 'choice_off';

    public function label(): string
    {
        return match ($this) {
            self::Force => 'Always On (Force)',
            self::Never => 'Always Off (Never)',
            self::ChoiceOn => 'User Choice (Default On)',
            self::ChoiceOff => 'User Choice (Default Off)',
        };
    }
}
