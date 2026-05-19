<?php

namespace App\Redactors;

use Crypt;
use OwenIt\Auditing\Contracts\AttributeRedactor;

class RightRedactor implements AttributeRedactor
{
    public static function redact($value): string
    {
        try {
            $value = Crypt::decryptString($value);
        } catch (\Exception $e) {
        }

        $total = strlen($value);
        $tenth = (int) ceil($total / 10);
        $length = ($total > $tenth) ? ($total - $tenth) : 1;

        return str_pad(substr($value, 0, -$length), $total, '#', STR_PAD_RIGHT);
    }
}
