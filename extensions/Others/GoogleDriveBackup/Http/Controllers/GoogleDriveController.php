<?php

namespace Paymenter\Extensions\Others\GoogleDriveBackup\Http\Controllers;

use App\Helpers\ExtensionHelper;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Paymenter\Extensions\Others\GoogleDriveBackup\Models\GoogleDriveToken;

class GoogleDriveController extends Controller
{
    private function extensionConfig(string $key): ?string
    {
        return ExtensionHelper::getConfig('GoogleDriveBackup', $key);
    }

    // -------------------------------------------------------------------------
    // Step 1 — Redirect to Google's OAuth consent screen
    // -------------------------------------------------------------------------

    public function redirect(Request $request)
    {
        $clientId    = $this->extensionConfig('google_client_id');
        $redirectUri = route('gdrive.callback');

        $params = http_build_query([
            'client_id'     => $clientId,
            'redirect_uri'  => $redirectUri,
            'response_type' => 'code',
            'scope'         => 'https://www.googleapis.com/auth/drive.file',
            'access_type'   => 'offline',
            'prompt'        => 'consent',    // always request refresh_token
            'state'         => csrf_token(), // CSRF guard
        ]);

        return redirect('https://accounts.google.com/o/oauth2/v2/auth?' . $params);
    }

    // -------------------------------------------------------------------------
    // Step 2 — Handle OAuth callback, exchange code for tokens
    // -------------------------------------------------------------------------

    public function callback(Request $request)
    {
        // CSRF check
        if ($request->input('state') !== csrf_token()) {
            return redirect()->route('gdrive.settings')
                ->with('error', 'Invalid state parameter. Please try connecting again.');
        }

        if ($request->has('error')) {
            return redirect()->route('gdrive.settings')
                ->with('error', 'Google authorisation was denied: ' . $request->input('error'));
        }

        $code        = $request->input('code');
        $redirectUri = route('gdrive.callback');

        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => $this->extensionConfig('google_client_id'),
            'client_secret' => $this->extensionConfig('google_client_secret'),
            'redirect_uri'  => $redirectUri,
            'grant_type'    => 'authorization_code',
        ]);

        if (!$tokenResponse->successful()) {
            return redirect()->route('gdrive.settings')
                ->with('error', 'Failed to retrieve access token from Google. Please try again.');
        }

        $tokens = $tokenResponse->json();

        // Persist tokens for this user
        GoogleDriveToken::updateOrCreate(
            ['user_id' => Auth::id()],
            [
                'access_token'  => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token'] ?? '',
                'expires_at'    => now()->timestamp + ($tokens['expires_in'] ?? 3600),
            ]
        );

        // Create a dedicated backup folder in the user's Drive
        $this->ensureBackupFolder(Auth::id());

        return redirect()->route('gdrive.settings')
            ->with('success', 'Google Drive connected successfully! Backups will run nightly.');
    }

    // -------------------------------------------------------------------------
    // Disconnect (revoke + delete local tokens)
    // -------------------------------------------------------------------------

    public function disconnect(Request $request)
    {
        $token = GoogleDriveToken::where('user_id', Auth::id())->first();

        if ($token) {
            // Revoke with Google (best-effort)
            try {
                Http::post('https://oauth2.googleapis.com/revoke', [
                    'token' => $token->access_token,
                ]);
            } catch (\Exception $e) {
                // Non-fatal
            }
            $token->delete();
        }

        return redirect()->route('gdrive.settings')
            ->with('success', 'Google Drive disconnected. Your backups in Drive are not deleted.');
    }

    // -------------------------------------------------------------------------
    // Helper — create "Paymenter Backups" folder in user's Drive on first connect
    // -------------------------------------------------------------------------

    private function ensureBackupFolder(int $userId): void
    {
        $tokenRecord = GoogleDriveToken::find($userId) ??
                       GoogleDriveToken::where('user_id', $userId)->first();

        if (!$tokenRecord || $tokenRecord->folder_id) {
            return; // folder already created
        }

        try {
            $accessToken = $this->freshAccessToken($tokenRecord);

            $response = Http::withToken($accessToken)->post(
                'https://www.googleapis.com/drive/v3/files',
                [
                    'name'     => 'Paymenter Tally Backups',
                    'mimeType' => 'application/vnd.google-apps.folder',
                ]
            );

            if ($response->successful()) {
                $tokenRecord->folder_id = $response->json('id');
                $tokenRecord->save();
            }
        } catch (\Exception $e) {
            // Non-fatal — backup command will create the folder if missing
        }
    }

    /**
     * Refresh the access token if it has expired and return a valid one.
     */
    public static function freshAccessToken(GoogleDriveToken $record): string
    {
        if (now()->timestamp < $record->expires_at - 60) {
            return $record->access_token;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id'     => ExtensionHelper::getConfig('GoogleDriveBackup', 'google_client_id'),
            'client_secret' => ExtensionHelper::getConfig('GoogleDriveBackup', 'google_client_secret'),
            'refresh_token' => $record->refresh_token,
            'grant_type'    => 'refresh_token',
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to refresh Google access token for user ' . $record->user_id);
        }

        $tokens = $response->json();

        $record->access_token = $tokens['access_token'];
        $record->expires_at   = now()->timestamp + ($tokens['expires_in'] ?? 3600);
        $record->save();

        return $record->access_token;
    }
}
