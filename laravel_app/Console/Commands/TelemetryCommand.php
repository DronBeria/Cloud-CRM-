<?php

namespace App\Console\Commands;

use App\Classes\Settings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelemetryCommand extends Command
{
    protected $signature = 'telemetry:send';
    protected $description = 'Sends telemetry data';

    public function handle(): int
    {
        if (!config('app.telemetry_enabled')) {
            return self::SUCCESS;
        }

        try {
            $telemetry = Settings::getTelemetry();
            Http::timeout(5)->post('https://telemetry.paymenter.org/api/telemetry', [
                'uuid' => $telemetry['uuid'],
                'version' => config('app.version', '1.0.0'),
            ]);
        } catch (\Throwable $e) {
            // Fail silently
        }

        return self::SUCCESS;
    }
}
