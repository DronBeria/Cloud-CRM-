<?php

namespace App\Console\Commands\Extension;

use Illuminate\Console\Command;

class Install extends Command
{
    protected $signature = 'extension:install {extension}';
    protected $description = 'Install an extension';

    public function handle(): int
    {
        $this->info('Installing extension: ' . $this->argument('extension'));
        return self::SUCCESS;
    }
}
