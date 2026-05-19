<?php

namespace App\Attributes;

use Attribute;

#[Attribute(Attribute::TARGET_CLASS)]
class DisabledIf
{
    public function __construct(
        public string $setting,
        public mixed $default = false,
        public bool $reverse = false,
    ) {}
}
