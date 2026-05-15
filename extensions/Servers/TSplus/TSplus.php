<?php

namespace Paymenter\Extensions\Servers\TSplus;

use App\Classes\Extension\Server;
use App\Models\Service;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * TSplus Server Extension
 *
 * Manages Windows user accounts on a TSplus server for browser-based
 * Tally / business-app access. Each customer gets an isolated Windows
 * user account with an NTFS-locked data directory.
 *
 * Tested against TSplus v14.x REST API.
 * API base: https://{host}/AppControl/apiv2
 */
class TSplus extends Server
{
    // -------------------------------------------------------------------------
    // HTTP helpers
    // -------------------------------------------------------------------------

    /**
     * Make an authenticated request to the TSplus Admin REST API.
     */
    private function request(string $endpoint, string $method = 'get', array $data = []): array
    {
        $base = rtrim('https://' . $this->config('host') . ':' . $this->config('port', '443'), '/');
        $url  = $base . '/AppControl/apiv2' . $endpoint;

        $response = Http::withoutVerifying()
            ->withBasicAuth($this->config('admin_user'), $this->config('admin_pass'))
            ->acceptJson()
            ->$method($url, $method === 'get' ? $data : []) ;

        // For non-GET requests, send as JSON body
        if ($method !== 'get' && !empty($data)) {
            $response = Http::withoutVerifying()
                ->withBasicAuth($this->config('admin_user'), $this->config('admin_pass'))
                ->acceptJson()
                ->withBody(json_encode($data), 'application/json')
                ->$method($url);
        }

        if (!$response->successful()) {
            throw new Exception(
                'TSplus API error [' . $response->status() . '] on ' . strtoupper($method) . ' ' . $endpoint . ': ' . $response->body()
            );
        }

        return $response->json() ?? [];
    }

    // -------------------------------------------------------------------------
    // Extension configuration (shown in admin panel)
    // -------------------------------------------------------------------------

    public function getConfig($values = []): array
    {
        return [
            [
                'name'     => 'host',
                'type'     => 'text',
                'label'    => 'TSplus Server Hostname / IP',
                'description' => 'Hostname or IP of your TSplus Windows Server (e.g. tally.yourcompany.com)',
                'required' => true,
            ],
            [
                'name'    => 'port',
                'type'    => 'text',
                'label'   => 'HTTPS Port',
                'default' => '443',
                'required' => true,
            ],
            [
                'name'      => 'admin_user',
                'type'      => 'text',
                'label'     => 'TSplus Admin Username',
                'required'  => true,
            ],
            [
                'name'      => 'admin_pass',
                'type'      => 'text',
                'label'     => 'TSplus Admin Password',
                'required'  => true,
                'encrypted' => true,
            ],
            [
                'name'        => 'data_path',
                'type'        => 'text',
                'label'       => 'Tally Data Base Path (on Windows Server)',
                'description' => 'Base directory where per-user Tally data folders live, e.g. D:\\TallyData',
                'default'     => 'D:\\TallyData',
                'required'    => true,
            ],
            // Optional: WinRM for automated NTFS ACL provisioning.
            // If left blank, run extensions/Servers/TSplus/scripts/setup-tally-acls.ps1
            // manually on the Windows server (see the README section in that file).
            [
                'name'        => 'winrm_host',
                'type'        => 'text',
                'label'       => 'WinRM Host (optional, for auto NTFS setup)',
                'description' => 'Leave blank to run NTFS setup script manually. If set, Paymenter will call WinRM to create isolated data directories automatically.',
                'required'    => false,
            ],
            [
                'name'      => 'winrm_user',
                'type'      => 'text',
                'label'     => 'WinRM Username (optional)',
                'required'  => false,
            ],
            [
                'name'      => 'winrm_pass',
                'type'      => 'text',
                'label'     => 'WinRM Password (optional)',
                'required'  => false,
                'encrypted' => true,
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Product-level configuration (shown when creating a product in admin)
    // -------------------------------------------------------------------------

    public function getProductConfig($values = []): array
    {
        return [
            [
                'name'        => 'app_name',
                'type'        => 'text',
                'label'       => 'Application Name',
                'description' => 'Shown on the Launch button, e.g. TallyPrime, Busy ERP',
                'default'     => 'TallyPrime',
                'required'    => true,
            ],
            [
                'name'        => 'user_group',
                'type'        => 'text',
                'label'       => 'Windows User Group',
                'description' => 'Windows group to add the user to on the TSplus server (e.g. TallyUsers)',
                'default'     => 'TallyUsers',
                'required'    => false,
            ],
            [
                'name'        => 'session_limit',
                'type'        => 'number',
                'label'       => 'Max Concurrent Sessions',
                'description' => 'Maximum simultaneous RDP sessions for this plan tier',
                'default'     => '1',
                'required'    => true,
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Connectivity test (admin panel "Test" button)
    // -------------------------------------------------------------------------

    public function testConfig(): bool|string
    {
        try {
            $this->request('/users');
        } catch (Exception $e) {
            return $e->getMessage();
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Service lifecycle
    // -------------------------------------------------------------------------

    /**
     * Called when a customer's service is provisioned (order paid / trial starts).
     *
     * Creates a Windows user account on the TSplus server and optionally
     * provisions the isolated Tally data directory via WinRM.
     *
     * Returns credential array that Paymenter sends in the welcome email.
     */
    public function createServer(Service $service, $settings, $properties): array
    {
        $username = $this->buildUsername($service);
        $password = Str::password(16, true, true, false);

        // Create user via TSplus API
        $payload = [
            'login'       => $username,
            'password'    => $password,
            'firstName'   => $service->user->first_name ?? '',
            'lastName'    => $service->user->last_name ?? '',
            'email'       => $service->user->email,
        ];

        if (!empty($settings['user_group'])) {
            $payload['groups'] = [$settings['user_group']];
        }

        $this->request('/users', 'post', $payload);

        // Persist credentials so suspend/terminate can find the account
        $this->saveProperty($service, 'tsplus_username', 'TSplus Username', $username);
        $this->saveProperty($service, 'tsplus_password', 'TSplus Password', $password);

        // Attempt automated NTFS ACL setup if WinRM is configured
        $this->provisionNtfsDirectory($username, $service->id);

        return [
            'username'   => $username,
            'password'   => $password,
            'access_url' => 'https://' . $this->config('host') . ':' . $this->config('port', '443'),
        ];
    }

    /**
     * Suspend: disable the Windows account. Data on disk is preserved.
     * Triggered by trial expiry or non-payment.
     */
    public function suspendServer(Service $service, $settings, $properties): bool
    {
        $username = $properties['tsplus_username'] ?? null;

        if (!$username) {
            throw new Exception('TSplus username not found on service #' . $service->id);
        }

        $this->request('/users/' . urlencode($username), 'put', ['disabled' => true]);

        return true;
    }

    /**
     * Unsuspend: re-enable the Windows account after payment.
     */
    public function unsuspendServer(Service $service, $settings, $properties): bool
    {
        $username = $properties['tsplus_username'] ?? null;

        if (!$username) {
            throw new Exception('TSplus username not found on service #' . $service->id);
        }

        $this->request('/users/' . urlencode($username), 'put', ['disabled' => false]);

        return true;
    }

    /**
     * Terminate: delete the Windows user account entirely.
     * Data directory is left on disk for the admin to archive or purge.
     */
    public function terminateServer(Service $service, $settings, $properties): bool
    {
        $username = $properties['tsplus_username'] ?? null;

        if (!$username) {
            // Already gone or never created — treat as success
            return true;
        }

        $this->request('/users/' . urlencode($username), 'delete');

        $service->properties()->whereIn('key', ['tsplus_username', 'tsplus_password'])->delete();

        return true;
    }

    // -------------------------------------------------------------------------
    // Actions shown on the customer service page
    // -------------------------------------------------------------------------

    public function getActions(Service $service, $settings, $properties): array
    {
        if (empty($properties['tsplus_username'])) {
            return [];
        }

        $appName = $settings['app_name'] ?? 'App';

        return [
            [
                'type'     => 'button',
                'label'    => 'Launch ' . $appName,
                'function' => 'ssoLink',
            ],
            [
                'type'     => 'view',
                'name'     => 'credentials',
                'label'    => 'Connection Info',
                'function' => 'credentialsView',
            ],
        ];
    }

    /**
     * Generate a single-use TSplus session token and return the browser launch URL.
     * The customer is redirected here when they click "Launch App".
     */
    public function ssoLink(Service $service, $settings, $properties): string
    {
        $username = $properties['tsplus_username'] ?? null;

        if (!$username) {
            throw new Exception('No TSplus account found for this service.');
        }

        // Request a one-time session token from TSplus
        $response = $this->request('/users/' . urlencode($username) . '/token', 'post');

        if (empty($response['token'])) {
            throw new Exception('TSplus did not return a session token. Check API credentials and server version.');
        }

        $base = 'https://' . $this->config('host') . ':' . $this->config('port', '443');

        // TSplus HTML5 client token URL
        return $base . '/?token=' . urlencode($response['token']);
    }

    /**
     * Render the "Connection Info" tab on the customer's service page.
     * Shows the TSplus URL and their Windows username (password hidden after creation).
     */
    public function credentialsView(Service $service, $settings, $properties): string
    {
        $username   = $properties['tsplus_username'] ?? '—';
        $accessUrl  = 'https://' . $this->config('host') . ':' . $this->config('port', '443');
        $appName    = $settings['app_name'] ?? 'App';

        // Register the view namespace if it hasn't been yet
        if (!array_key_exists('tsplus', \Illuminate\Support\Facades\View::getFinder()->getHints())) {
            \Illuminate\Support\Facades\View::addNamespace('tsplus', __DIR__ . '/resources/views');
        }

        return view('tsplus::credentials', compact('username', 'accessUrl', 'appName'))->render();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build a short, deterministic Windows username from the service ID.
     * Windows usernames max 20 chars; we use tally_{id} (safe for all service IDs).
     */
    private function buildUsername(Service $service): string
    {
        return 'tally_' . $service->id;
    }

    private function saveProperty(Service $service, string $key, string $name, string $value): void
    {
        $service->properties()->updateOrCreate(['key' => $key], ['name' => $name, 'value' => $value]);
    }

    /**
     * Run the NTFS isolation PowerShell via WinRM if credentials are configured.
     * Silently logs a warning if WinRM is not set up — admin must run manually.
     */
    private function provisionNtfsDirectory(string $username, int $serviceId): void
    {
        $winrmHost = $this->config('winrm_host');

        if (empty($winrmHost)) {
            Log::info("TSplus: WinRM not configured. Run setup-tally-acls.ps1 manually for service #{$serviceId} (user: {$username}).");
            return;
        }

        $dataPath = rtrim($this->config('data_path', 'D:\\TallyData'), '\\');
        $userPath = $dataPath . '\\' . $username;

        // PowerShell one-liner: create dir + lock ACL to this user only
        $ps = "New-Item -ItemType Directory -Force -Path '{$userPath}'; " .
              "\$acl = Get-Acl '{$userPath}'; " .
              "\$acl.SetAccessRuleProtection(\$true, \$false); " .
              "\$rule = New-Object System.Security.AccessControl.FileSystemAccessRule('{$username}','FullControl','ContainerInherit,ObjectInherit','None','Allow'); " .
              "\$acl.SetAccessRule(\$rule); " .
              "Set-Acl '{$userPath}' \$acl";

        try {
            $this->execWinRm($winrmHost, $ps);
        } catch (Exception $e) {
            // Non-fatal: log and continue. Admin can run the script manually.
            Log::warning("TSplus: WinRM NTFS setup failed for service #{$serviceId}: " . $e->getMessage());
        }
    }

    /**
     * Execute a PowerShell command on the Windows server via WinRM (HTTP, port 5985).
     * Requires WinRM to be enabled on the server: `winrm quickconfig`
     */
    private function execWinRm(string $host, string $psCommand): void
    {
        $user = $this->config('winrm_user');
        $pass = $this->config('winrm_pass');

        // WS-Management SOAP envelope for PowerShell execution
        $shellId = Str::uuid()->toString();
        $messageId = 'uuid:' . Str::uuid()->toString();
        $encoded = base64_encode($psCommand);

        $createShellXml = <<<XML
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:wsmid="http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd"
            xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd"
            xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:rsp="http://schemas.microsoft.com/wbem/wsman/1/windows/shell"
            xmlns:cfg="http://schemas.microsoft.com/wbem/wsman/1/config">
  <s:Header>
    <wsa:To>http://{$host}:5985/wsman</wsa:To>
    <wsman:ResourceURI s:mustUnderstand="true">http://schemas.microsoft.com/wbem/wsman/1/windows/shell/cmd</wsman:ResourceURI>
    <wsa:ReplyTo><wsa:Address s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address></wsa:ReplyTo>
    <wsa:Action s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/09/transfer/Create</wsa:Action>
    <wsa:MessageID>{$messageId}</wsa:MessageID>
    <wsman:Locale xml:lang="en-US" s:mustUnderstand="false"/>
    <wsman:OptionSet><wsman:Option Name="WINRS_ALLOW_COMPRESS_INPUT">FALSE</wsman:Option></wsman:OptionSet>
    <wsman:OperationTimeout>PT60.000S</wsman:OperationTimeout>
  </s:Header>
  <s:Body>
    <rsp:Shell><rsp:InputStreams>stdin</rsp:InputStreams><rsp:OutputStreams>stdout stderr</rsp:OutputStreams></rsp:Shell>
  </s:Body>
</s:Envelope>
XML;

        $response = Http::withBasicAuth($user, $pass)
            ->withHeaders(['Content-Type' => 'application/soap+xml;charset=UTF-8'])
            ->withBody($createShellXml, 'application/soap+xml;charset=UTF-8')
            ->post("http://{$host}:5985/wsman");

        if (!$response->successful()) {
            throw new Exception("WinRM shell creation failed [{$response->status()}]: " . $response->body());
        }

        // Extract ShellId from response (simple regex — avoids XML parser dependency)
        preg_match('/<rsp:ShellId>(.+?)<\/rsp:ShellId>/', $response->body(), $matches);
        $shellId = $matches[1] ?? null;

        if (!$shellId) {
            throw new Exception('WinRM did not return a ShellId.');
        }

        // Execute the PowerShell command inside the shell
        $execMsgId = 'uuid:' . Str::uuid()->toString();
        $commandXml = <<<XML
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd"
            xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:rsp="http://schemas.microsoft.com/wbem/wsman/1/windows/shell">
  <s:Header>
    <wsa:To>http://{$host}:5985/wsman</wsa:To>
    <wsman:ResourceURI s:mustUnderstand="true">http://schemas.microsoft.com/wbem/wsman/1/windows/shell/cmd</wsman:ResourceURI>
    <wsa:ReplyTo><wsa:Address s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address></wsa:ReplyTo>
    <wsa:Action s:mustUnderstand="true">http://schemas.microsoft.com/wbem/wsman/1/windows/shell/Command</wsa:Action>
    <wsa:MessageID>{$execMsgId}</wsa:MessageID>
    <wsman:SelectorSet><wsman:Selector Name="ShellId">{$shellId}</wsman:Selector></wsman:SelectorSet>
  </s:Header>
  <s:Body>
    <rsp:CommandLine>
      <rsp:Command>powershell.exe</rsp:Command>
      <rsp:Arguments>-EncodedCommand {$encoded}</rsp:Arguments>
    </rsp:CommandLine>
  </s:Body>
</s:Envelope>
XML;

        $execResponse = Http::withBasicAuth($user, $pass)
            ->withHeaders(['Content-Type' => 'application/soap+xml;charset=UTF-8'])
            ->withBody($commandXml, 'application/soap+xml;charset=UTF-8')
            ->post("http://{$host}:5985/wsman");

        if (!$execResponse->successful()) {
            throw new Exception("WinRM command execution failed [{$execResponse->status()}]: " . $execResponse->body());
        }
    }
}
