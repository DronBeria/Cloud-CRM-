<?php

namespace App\Console\Commands;

use App\Models\CronStat;
use Illuminate\Console\Command;

class ScheduleHeartbeatCommand extends Command
{
    protected $signature = 'schedule:heartbeat';
    protected $description = 'Updates the last scheduler run time';

    public function handle(): int
    {
        CronStat::updateOrCreate(
            ['key' => 'last_run'],
            ['value' => now()->toDateTimeString()]
        );

        return self::SUCCESS;
    }
}
