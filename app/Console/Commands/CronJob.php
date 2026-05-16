<?php

namespace App\Console\Commands;

use App\Models\Service;
use App\Services\Service\RenewServiceService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Throwable;

class CronJob extends Command
{
    protected $signature = 'cronjob:run';
    protected $description = 'Runs daily to send out invoices, suspend servers, etc.';

    public function handle(RenewServiceService $renewService): int
    {
        $this->info('Running daily cron job...');

        // Process services due for renewal
        $services = Service::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', Carbon::now()->addDays(config('settings.invoice_days_before', 7)))
            ->get();

        foreach ($services as $service) {
            try {
                $renewService->handle($service);
            } catch (Throwable $e) {
                $this->error("Failed to renew service #{$service->id}: " . $e->getMessage());
                report($e);
            }
        }

        // Suspend overdue services
        $overdueServices = Service::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now())
            ->get();

        foreach ($overdueServices as $service) {
            try {
                $service->update(['status' => 'suspended']);
                $this->info("Suspended service #{$service->id}");
            } catch (Throwable $e) {
                $this->error("Failed to suspend service #{$service->id}: " . $e->getMessage());
                report($e);
            }
        }

        $this->info('Cron job completed.');

        return self::SUCCESS;
    }
}
