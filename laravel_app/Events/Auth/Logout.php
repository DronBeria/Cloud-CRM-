<?php

namespace App\Events\Auth;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class Logout
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public User $user) {}
}
