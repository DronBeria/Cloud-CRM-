<?php

namespace Paymenter\Extensions\Others\GoogleDriveBackup;

use App\Classes\Extension\Extension;
use App\Helpers\ExtensionHelper;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\View;
use Livewire\Livewire;
use Paymenter\Extensions\Others\GoogleDriveBackup\Console\Commands\BackupToGoogleDrive;
use Paymenter\Extensions\Others\GoogleDriveBackup\Livewire\GoogleDriveSettings;

/**
 * Google Drive Backup Extension
 *
 * Lets customers link their Google Drive account and automatically receive
 * nightly encrypted ZIP backups of their Tally data directory.
 *
 * Setup:
 *   1. Create a Google Cloud project and enable the Drive API.
 *   2. Create OAuth 2.0 credentials (Web Application type).
 *   3. Add <your-domain>/google-drive/callback to the authorised redirect URIs.
 *   4. Enter the Client ID and Secret in the extension settings.
 */
class GoogleDriveBackup extends Extension
{
    public function __construct(public $config = []) {}

    // -------------------------------------------------------------------------
    // Admin configuration fields
    // -------------------------------------------------------------------------

    public function getConfig($values = []): array
    {
        return [
            [
                'name'        => 'google_client_id',
                'label'       => 'Google OAuth Client ID',
                'type'        => 'text',
                'description' => 'From Google Cloud Console → APIs & Services → Credentials',
                'required'    => true,
            ],
            [
                'name'        => 'google_client_secret',
                'label'       => 'Google OAuth Client Secret',
                'type'        => 'text',
                'required'    => true,
                'encrypted'   => true,
            ],
            [
                'name'        => 'backup_source_base',
                'label'       => 'Tally Data Base Path (on Windows Server)',
                'type'        => 'text',
                'description' => 'Must match the TSplus extension data_path setting, e.g. D:\\TallyData',
                'default'     => 'D:\\TallyData',
                'required'    => true,
            ],
            [
                'name'        => 'backup_time',
                'label'       => 'Nightly Backup Time (server time, 24h)',
                'type'        => 'text',
                'default'     => '02:00',
                'description' => 'HH:MM — backups run once per day at this time',
                'required'    => true,
            ],
            [
                'name'        => 'backup_retain_days',
                'label'       => 'Retention: Keep Last N Backups in Drive',
                'type'        => 'number',
                'default'     => '7',
                'description' => 'Older backups beyond this count are deleted from the customer\'s Drive folder',
                'required'    => true,
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Extension lifecycle
    // -------------------------------------------------------------------------

    public function installed(): void
    {
        ExtensionHelper::runMigrations('extensions/Others/GoogleDriveBackup/database/migrations');
    }

    public function uninstalled(): void
    {
        ExtensionHelper::rollbackMigrations('extensions/Others/GoogleDriveBackup/database/migrations');
    }

    public function boot(): void
    {
        require __DIR__ . '/routes/web.php';

        View::addNamespace('gdrive', __DIR__ . '/resources/views');
        Lang::addNamespace('gdrive', __DIR__ . '/resources/lang');

        Livewire::component('gdrive-settings', GoogleDriveSettings::class);

        // Add "Google Drive Backup" link to the customer account navigation
        Event::listen('navigation.account', function () {
            return [
                'name'     => 'Google Drive Backup',
                'route'    => 'gdrive.settings',
                'priority' => 20,
            ];
        });

        // Schedule the nightly backup command
        $backupTime = $this->config('backup_time', '02:00');
        Schedule::command(BackupToGoogleDrive::class)
            ->dailyAt($backupTime)
            ->withoutOverlapping()
            ->onOneServer()
            ->description('Google Drive: nightly Tally data backup for all linked users');
    }
}
