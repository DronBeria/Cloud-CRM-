<?php

namespace App\Events$namespace;

use App\Models$model;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class Deleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ServiceUpgrade $serviceUpgrade) {}
}
