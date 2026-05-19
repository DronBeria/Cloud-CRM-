<?php

namespace App\Console\Commands\Extension;

use Illuminate\Console\Command;

class Upgrade extends Command
{
    protected $signature = 'extension:upgrade {extension}';
    protected $description = 'Upgrade an extension';

    public function handle(): int
    {
        $this->info('Upgrading extension: ' . $this->argument('extension'));
        return self::SUCCESS;
    }
}
