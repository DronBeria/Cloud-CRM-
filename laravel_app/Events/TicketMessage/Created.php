<?php

namespace App\Events\TicketMessage;

use App\Models\TicketMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class Created
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public TicketMessage $ticketMessage) {}
}
