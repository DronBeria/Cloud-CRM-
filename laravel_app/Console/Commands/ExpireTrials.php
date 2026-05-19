<?php

namespace App\Console\Commands;

use App\Jobs\Server\SuspendJob;
use App\Models\Service;
use Illuminate\Console\Command;

/**
 * Suspend free-trial services whose trial period has ended.
 *
 * The main CronJob handles recurring subscription suspension on non-payment.
 * Free/trial plan types never generate invoices, so they need this separate
 * command to enforce the trial window.
 *
 * Runs daily (registered in routes/console.php).
 *
 * To manually expire a specific service:
 *   php artisan trials:expire --service_id=42
 */
class ExpireTrials extends Command
{
    protected $signature   = 'trials:expire {--service_id= : Expire a specific service by ID}';
    protected $description = 'Suspend free-trial services whose trial period has expired';

    public function handle(): int
    {
        $query = Service::query()
            ->where('status', Service::STATUS_ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->whereHas('plan', fn ($q) => $q->whereIn('type', ['free', 'trial']));

        if ($serviceId = $this->option('service_id')) {
            $query->where('id', $serviceId);
        }

        $expired = $query->with(['user', 'product', 'plan'])->get();

        if ($expired->isEmpty()) {
            $this->info('No expired trials found.');
            return self::SUCCESS;
        }

        $this->info("Suspending {$expired->count()} expired trial(s)...");

        foreach ($expired as $service) {
            $service->status = Service::STATUS_SUSPENDED;
            $service->save();

            SuspendJob::dispatch($service);

            $this->line("  ✓ Suspended service #{$service->id} (user #{$service->user_id}: {$service->user->email})");
        }

        $this->info('Done.');

        return self::SUCCESS;
    }
}
