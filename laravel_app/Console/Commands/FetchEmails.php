<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class FetchEmails extends Command
{
    protected $signature = 'emails:fetch';
    protected $description = 'Import ticket emails using IMAP';

    public function handle(): int
    {
        if (!config('settings.ticket_mail_piping')) {
            return self::SUCCESS;
        }

        // IMAP email fetching requires additional configuration
        $this->info('Email fetching is not configured.');

        return self::SUCCESS;
    }
}
