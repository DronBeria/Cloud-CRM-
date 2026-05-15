<?php

namespace Paymenter\Extensions\Others\GoogleDriveBackup\Console\Commands;

use App\Helpers\ExtensionHelper;
use App\Models\Service;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Paymenter\Extensions\Others\GoogleDriveBackup\Http\Controllers\GoogleDriveController;
use Paymenter\Extensions\Others\GoogleDriveBackup\Models\GoogleDriveToken;

/**
 * Nightly backup command: compresses each user's Tally data folder and
 * uploads it to their linked Google Drive. Runs once per day via the
 * Laravel scheduler (registered in GoogleDriveBackup::boot()).
 *
 * Assumptions:
 *   - Paymenter runs on the SAME Linux server that mounts the Windows data
 *     share via SMB/CIFS (e.g. /mnt/tally-data/tally_42/) OR the data path
 *     is accessible from the PHP process.
 *   - For a pure Windows deployment, wrap this with a PowerShell backup
 *     script that pushes the ZIP to a shared staging directory first.
 */
class BackupToGoogleDrive extends Command
{
    protected $signature   = 'gdrive:backup {--user_id= : Only back up a specific user ID}';
    protected $description = 'Upload nightly Tally data backups to each customer\'s Google Drive';

    public function handle(): int
    {
        $basePath    = ExtensionHelper::getConfig('GoogleDriveBackup', 'backup_source_base') ?? 'D:\\TallyData';
        $retainDays  = (int) (ExtensionHelper::getConfig('GoogleDriveBackup', 'backup_retain_days') ?? 7);

        $query = GoogleDriveToken::query();

        if ($userId = $this->option('user_id')) {
            $query->where('user_id', $userId);
        }

        $tokens = $query->get();

        if ($tokens->isEmpty()) {
            $this->info('No users have linked Google Drive. Nothing to do.');
            return self::SUCCESS;
        }

        $this->info("Starting Google Drive backup for {$tokens->count()} user(s)...");

        $successCount = 0;
        $failCount    = 0;

        foreach ($tokens as $token) {
            try {
                $this->backupUser($token, $basePath, $retainDays);
                $successCount++;
            } catch (\Exception $e) {
                $failCount++;
                $this->error("  ✗ User #{$token->user_id}: " . $e->getMessage());
                Log::error("GoogleDriveBackup: User #{$token->user_id} failed: " . $e->getMessage());
            }
        }

        $this->info("Done. Success: {$successCount} | Failed: {$failCount}");

        return $failCount > 0 ? self::FAILURE : self::SUCCESS;
    }

    // -------------------------------------------------------------------------

    private function backupUser(GoogleDriveToken $token, string $basePath, int $retainDays): void
    {
        // Resolve the Windows username from the user's active TSplus service
        $service = Service::where('user_id', $token->user_id)
            ->where('status', Service::STATUS_ACTIVE)
            ->whereHas('product', fn ($q) => $q->whereHas('server'))
            ->with('properties')
            ->first();

        $username = optional($service?->properties->firstWhere('key', 'tsplus_username'))->value;

        if (!$username) {
            $this->warn("  ⚠ User #{$token->user_id}: no active TSplus service found, skipping.");
            return;
        }

        // Build the source path (Linux mount or local path)
        $sourcePath = rtrim($basePath, '/\\') . DIRECTORY_SEPARATOR . $username;

        if (!is_dir($sourcePath)) {
            $this->warn("  ⚠ User #{$token->user_id}: data directory not found at {$sourcePath}, skipping.");
            return;
        }

        $this->line("  → User #{$token->user_id} ({$username})");

        // Create a temp ZIP archive
        $timestamp = now()->format('Y-m-d_His');
        $zipName   = "tally_backup_{$username}_{$timestamp}.zip";
        $zipPath   = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $zipName;

        $this->createZip($sourcePath, $zipPath);

        // Get / refresh Drive token
        $accessToken = GoogleDriveController::freshAccessToken($token);

        // Ensure backup folder exists in Drive
        $folderId = $this->ensureDriveFolder($token, $accessToken);

        // Upload the ZIP
        $this->uploadToDrive($zipPath, $zipName, $folderId, $accessToken);

        // Clean up temp file
        @unlink($zipPath);

        // Prune old backups beyond retention limit
        $this->pruneOldBackups($folderId, $accessToken, $retainDays);

        // Update last_backup_at
        $token->last_backup_at = now();
        $token->save();

        $this->line("    ✓ Backup uploaded: {$zipName}");
    }

    // -------------------------------------------------------------------------
    // ZIP helper
    // -------------------------------------------------------------------------

    private function createZip(string $sourcePath, string $zipPath): void
    {
        if (!class_exists(\ZipArchive::class)) {
            throw new \Exception('PHP ZipArchive extension is required for backups.');
        }

        $zip = new \ZipArchive();

        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new \Exception("Cannot create ZIP at {$zipPath}");
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourcePath, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $relativePath = substr($file->getRealPath(), strlen($sourcePath) + 1);
                $zip->addFile($file->getRealPath(), $relativePath);
            }
        }

        $zip->close();
    }

    // -------------------------------------------------------------------------
    // Google Drive helpers
    // -------------------------------------------------------------------------

    private function ensureDriveFolder(GoogleDriveToken $token, string $accessToken): string
    {
        if ($token->folder_id) {
            return $token->folder_id;
        }

        $response = Http::withToken($accessToken)
            ->post('https://www.googleapis.com/drive/v3/files', [
                'name'     => 'Paymenter Tally Backups',
                'mimeType' => 'application/vnd.google-apps.folder',
            ]);

        if (!$response->successful()) {
            throw new \Exception('Could not create Google Drive backup folder: ' . $response->body());
        }

        $folderId = $response->json('id');
        $token->folder_id = $folderId;
        $token->save();

        return $folderId;
    }

    private function uploadToDrive(string $zipPath, string $zipName, string $folderId, string $accessToken): void
    {
        $fileSize = filesize($zipPath);

        // Use resumable upload for files > 5 MB, direct for smaller
        if ($fileSize > 5 * 1024 * 1024) {
            $this->resumableUpload($zipPath, $zipName, $folderId, $accessToken, $fileSize);
        } else {
            $this->multipartUpload($zipPath, $zipName, $folderId, $accessToken);
        }
    }

    private function multipartUpload(string $zipPath, string $zipName, string $folderId, string $accessToken): void
    {
        $response = Http::withToken($accessToken)
            ->attach('file', fopen($zipPath, 'r'), $zipName, ['Content-Type' => 'application/zip'])
            ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', [
                'name'    => $zipName,
                'parents' => [$folderId],
            ]);

        if (!$response->successful()) {
            throw new \Exception('Drive upload failed: ' . $response->body());
        }
    }

    private function resumableUpload(string $zipPath, string $zipName, string $folderId, string $accessToken, int $fileSize): void
    {
        // Initiate resumable session
        $initResponse = Http::withToken($accessToken)
            ->withHeaders([
                'X-Upload-Content-Type'   => 'application/zip',
                'X-Upload-Content-Length' => $fileSize,
                'Content-Type'            => 'application/json',
            ])
            ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', [
                'name'    => $zipName,
                'parents' => [$folderId],
            ]);

        if (!$initResponse->successful() || !$initResponse->header('Location')) {
            throw new \Exception('Could not initiate resumable Drive upload.');
        }

        $uploadUrl = $initResponse->header('Location');

        // Upload the file in one request (suitable for files up to ~100 MB)
        $uploadResponse = Http::withToken($accessToken)
            ->withHeaders([
                'Content-Type'   => 'application/zip',
                'Content-Length' => $fileSize,
            ])
            ->withBody(file_get_contents($zipPath), 'application/zip')
            ->put($uploadUrl);

        if (!$uploadResponse->successful()) {
            throw new \Exception('Resumable Drive upload failed: ' . $uploadResponse->body());
        }
    }

    private function pruneOldBackups(string $folderId, string $accessToken, int $retainCount): void
    {
        $response = Http::withToken($accessToken)->get('https://www.googleapis.com/drive/v3/files', [
            'q'       => "'{$folderId}' in parents and trashed = false",
            'orderBy' => 'createdTime desc',
            'fields'  => 'files(id,name,createdTime)',
        ]);

        if (!$response->successful()) {
            return; // Non-fatal
        }

        $files = $response->json('files', []);

        // Delete everything beyond the retention window
        $toDelete = array_slice($files, $retainCount);

        foreach ($toDelete as $file) {
            Http::withToken($accessToken)->delete("https://www.googleapis.com/drive/v3/files/{$file['id']}");
        }
    }
}
