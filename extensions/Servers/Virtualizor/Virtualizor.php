<?php

namespace Paymenter\Extensions\Servers\Virtualizor;

use App\Classes\Extension\Server;
use App\Models\Product;
use App\Models\Service;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class Virtualizor extends Server
{
    private function request($act, $method = 'get', $data = [], $clientApi = false): array
    {
        if ($clientApi) {
            $url = 'https://' . $this->config('ip') . ':' . $this->config('client_port') . '/index.php?api=json&adminapikey=' . $this->config('key') . '&adminapipass=' . $this->config('password') . '&act=' . $act;
        } else {
            $url = 'https://' . $this->config('ip') . ':' . $this->config('port') . '/index.php?api=json&adminapikey=' . $this->config('key') . '&adminapipass=' . $this->config('password') . '&act=' . $act;
        }

        if ($method == 'get') {
            $url .= '&' . http_build_query($data);
            $response = Http::withoutVerifying()->get($url)
                ->throw();
        } elseif ($method == 'post') {
            $response = Http::withoutVerifying()->asForm()->$method($url, $data)
                ->throw();
        }

        if (!$response->successful()) {
            throw new Exception('Failed to connect to Virtualizor API');
        }

        return $response->json();
    }

    /**
     * Get all the configuration for the extension
     *
     * @param  array  $values
     */
    public function getConfig($values = []): array
    {
        return [
            [
                'name' => 'key',
                'type' => 'text',
                'label' => 'API Key',
                'required' => true,
            ],
            [
                'name' => 'password',
                'type' => 'text',
                'label' => 'API Password',
                'required' => true,
            ],
            [
                'name' => 'ip',
                'type' => 'text',
                'label' => 'IP Address',
                'required' => true,
            ],
            [
                'name' => 'port',
                'type' => 'text',
                'label' => 'Port',
                'required' => true,
                'default' => '4085',
            ],
            [
                'name' => 'client_port',
                'type' => 'text',
                'label' => 'Client Port (normally 4083)',
                'default' => '4083',
                'required' => true,
            ],
        ];
    }

    /**
     * Get product config
     *
     * @param  array  $values
     */
    public function getProductConfig($values = []): array
    {
        // Get Plan list
        $plans = $this->request('plans');
        $allplans = [];
        foreach ($plans['plans'] as $plan) {
            $allplans[$plan['plan_name']] = $plan['plan_name'];
        }

        return [
            [
                'name' => 'virt',
                'label' => 'Virtualizon Type',
                'type' => 'select',
                'required' => true,
                'options' => $this->request('config')['globals']['virts'],
            ],
            [
                'name' => 'planname',
                'label' => 'Plan Name',
                'type' => 'select',
                'required' => true,
                'options' => $allplans,
            ],
        ];
    }

    public function getCheckoutConfig(Product $product)
    {
        $os = $this->request('os');
        if (!isset($os['oslist'][$product->settings()->where('key', 'virt')->first()->value])) {
            throw new Exception('Invalid OS');
        }
        $allOs = [];
        foreach ($os['oslist'][$product->settings()->where('key', 'virt')->first()->value] as $o) {
            foreach ($o as $osId => $osName) {
                $allOs[$osId] = $osName['name'];
            }
        }

        return [
            [
                'name' => 'hostname',
                'type' => 'text',
                'validation' => 'regex:/^(?!:\/\/)(?=.{1,255}$)((.{1,63}\.){1,127}(?![0-9]*$)[a-z0-9-]+\.?)$/i',
                'label' => 'Hostname',
                'placeholder' => 'example.com',
                'required' => true,
            ],
            [
                'name' => 'os',
                'type' => 'select',
                'friendlyName' => 'Operating System',
                'required' => true,
                'options' => $allOs,
            ],
        ];
    }

    /**
     * Check if currenct configuration is valid
     */
    public function testConfig(): bool|string
    {
        try {
            $this->request('users');
        } catch (Exception $e) {
            return $e->getMessage();
        }

        return true;
    }

    private function getUser(User $user)
    {
        $users = $this->request('users', data: ['email' => $user->email]);
        if (!empty($users['users'])) {
            return $users['users'][key($users['users'])];
        }
        $password = Str::password(16);
        // Create user
        $data = [
            'adduser' => 1,
            'priority' => 0,
            'newpass' => $password,
            'newemail' => $user->email,
            'fname' => $user->first_name,
            'lname' => $user->last_name,
        ];
        $response = $this->request('adduser', 'post', $data);

        if (!$response['done']) {
            throw new Exception('Failed to create user');
        }

        $users = $this->request('users', data: ['email' => $user->email]);
        $user = $users['users'][key($users['users'])];
        $user['password'] = $password;

        return $user;
    }

    /**
     * Create a server
     *
     * @param  array  $settings  (product settings)
     * @param  array  $properties  (checkout options)
     * @return bool
     */
    public function createServer(Service $service, $settings, $properties)
    {
        $settings = array_merge($settings, $properties);
        $data = [
            'planname' => $settings['planname'],
            'ptype' => $settings['virt'],
        ];
        $plans = $this->request('plans', 'get', $data);
        // Check if plan exists
        if (empty($plans['plans'])) {
            throw new Exception('Invalid plan OR Virtualization type');
        }
        $plan = $plans['plans'][key($plans['plans'])];
        $password = Str::random(12);

        // Create user
        $user = $this->getUser($service->user);

        $data = [
            'addvps' => 1,
            'node_select' => 1,
            'virt' => $settings['virt'],
            'uid' => $user['uid'],
            'osid' => $settings['os'],
            'hostname' => $settings['hostname'],
            'rootpass' => $password,
            'num_ips6' => isset($settings['ips6']) ? $settings['ips6'] : $plan['ips6'],
            'num_ips6_subnet' => isset($settings['ips6_subnet']) ? $settings['ips6_subnet'] : $plan['ips6_subnet'],
            'num_ips' => isset($settings['ips']) ? $settings['ips'] : $plan['ips'],
            'ram' => isset($settings['ram']) ? $settings['ram'] : $plan['ram'],
            'swapram' => isset($settings['swap']) ? $settings['swap'] : $plan['swap'],
            'bandwidth' => isset($settings['bandwidth']) ? $settings['bandwidth'] : $plan['bandwidth'],
            'network_speed' => isset($settings['network_speed']) ? $settings['network_speed'] : $plan['network_speed'],
            'cpu' => isset($settings['cpu']) ? $settings['cpu'] : $plan['cpu'],
            'cores' => isset($settings['cores']) ? $settings['cores'] : $plan['cores'],
            'cpu_percent' => isset($settings['cpu_percent']) ? $settings['cpu_percent'] : $plan['cpu_percent'],
            'vnc' => isset($settings['vnc']) ? $settings['vnc'] : $plan['vnc'],
            'kvm_cache' => $plan['kvm_cache'],
            'io_mode' => $plan['io_mode'],
            'vnc_keymap' => $plan['vnc_keymap'],
            'nic_type' => $plan['nic_type'],
            'osreinstall_limit' => isset($settings['osreinstall_limit']) ? $settings['osreinstall_limit'] : $plan['osreinstall_limit'],
            'space' => isset($settings['space']) ? $settings['space'] : $plan['space'],
            'plid' => $plan['plid'],
        ];

        $response = $this->request('addvs', 'post', $data);

        if (isset($response['error']) && !empty($response['error'])) {
            throw new Exception('Failed to create server with error: ' . implode(', ', $response['error']));
        }

        $service->properties()->updateOrCreate([
            'key' => 'server_id',
        ], [
            'name' => 'Virtualizor Server ID',
            'value' => $response['newvs']['vpsid'],
        ]);

        return [
            'vps' => $response['newvs'],
            'user' => $user,
        ];
    }

    /**
     * Suspend a server
     *
     * @param  array  $settings  (product settings)
     * @param  array  $properties  (checkout options)
     * @return bool
     */
    public function suspendServer(Service $service, $settings, $properties)
    {
        if (!isset($properties['server_id'])) {
            throw new Exception('Server does not exist');
        }

        // Suspend server
        $this->request('vs', 'get', ['suspend' => $properties['server_id']]);

        return true;
    }

    /**
     * Unsuspend a server
     *
     * @param  array  $settings  (product settings)
     * @param  array  $properties  (checkout options)
     * @return bool
     */
    public function unsuspendServer(Service $service, $settings, $properties)
    {
        if (!isset($properties['server_id'])) {
            throw new Exception('Server does not exist');
        }

        // Unsuspend server
        $this->request('vs', 'get', ['unsuspend' => $properties['server_id']]);

        return true;
    }

    /**
     * Terminate a server
     *
     * @param  array  $settings  (product settings)
     * @param  array  $properties  (checkout options)
     * @return bool
     */
    public function terminateServer(Service $service, $settings, $properties)
    {
        if (!isset($properties['server_id'])) {
            throw new Exception('Server does not exist');
        }

        // Terminate server
        $request = $this->request('vs', 'post', ['delete' => $properties['server_id']]);

        if (empty($request['done']) || !$request['done']) {
            throw new Exception('Failed to terminate server');
        }

        // Remove server id
        $service->properties()->where('key', 'server_id')->delete();

        return true;
    }

    public function getActions(Service $service, $settings, $properties): array
    {
        if (!isset($properties['server_id'])) {
            return [];
        }

        return [
            [
                'type'     => 'button',
                'label'    => 'Go to Server',
                'function' => 'ssoLink',
            ],
            [
                'type'     => 'view',
                'name'     => 'performance',
                'label'    => 'Performance',
                'function' => 'performanceView',
            ],
        ];
    }

    public function ssoLink(Service $service, $settings, $properties): string
    {
        if (!isset($properties['server_id'])) {
            throw new Exception('Server does not exist');
        }

        $response = $this->request('sso', data: ['svs' => $properties['server_id']], clientApi: true);

        if (!isset($response['sid'])) {
            throw new Exception('Failed to get VNC link');
        }

        return 'https://' . $this->config('ip') . ':' . $this->config('client_port') . '/' . $response['token_key'] . '/?as=' . $response['sid'] . '&svs=' . $properties['server_id'];
    }

    /**
     * Render the Performance tab on the customer's service page.
     *
     * Fetches live CPU / RAM / disk metrics from a Netdata or Glances agent
     * running on the VM. Falls back to a "not available" message if the
     * metrics endpoint is unreachable (VM powered off, agent not installed).
     *
     * Install the agent inside the Windows golden image:
     *   Netdata  → https://learn.netdata.cloud/docs/installing/windows
     *   Glances  → pip install glances  (then: glances -w)
     */
    public function performanceView(Service $service, $settings, $properties): string
    {
        if (!isset($properties['server_id'])) {
            return '<p class="p-4 text-base/60">No server assigned yet.</p>';
        }

        // Resolve the VM's primary IPv4 from Virtualizor
        $vmIp = null;
        try {
            $vsInfo = $this->request('vs', 'get', ['vpsid' => $properties['server_id']]);
            $vmIp   = $vsInfo['vs'][$properties['server_id']]['ips'][0] ?? null;
        } catch (Exception $e) {
            // Non-critical — handled below
        }

        $metrics  = null;
        $error    = null;
        $agentUrl = null;

        if ($vmIp) {
            // Try Netdata (port 19999) then Glances (port 61208)
            $sources = [
                'netdata' => "http://{$vmIp}:19999/api/v1/allmetrics?format=json",
                'glances' => "http://{$vmIp}:61208/api/3/all",
            ];

            foreach ($sources as $agent => $url) {
                try {
                    $resp = Http::timeout(3)->get($url);
                    if ($resp->successful()) {
                        $raw     = $resp->json();
                        $metrics = $this->normaliseMetrics($agent, $raw);
                        $agentUrl = $url;
                        break;
                    }
                } catch (Exception $e) {
                    // Try next agent
                }
            }

            if (!$metrics) {
                $error = 'Metrics agent unreachable on ' . $vmIp . '. Install Netdata or Glances in the VM golden image to enable live monitoring.';
            }
        } else {
            $error = 'VM IP address could not be resolved from Virtualizor.';
        }

        if (!array_key_exists('virtualizor', \Illuminate\Support\Facades\View::getFinder()->getHints())) {
            \Illuminate\Support\Facades\View::addNamespace('virtualizor', __DIR__ . '/resources/views');
        }

        return view('virtualizor::performance', compact('metrics', 'error', 'vmIp'))->render();
    }

    /**
     * Normalise raw Netdata / Glances JSON into a flat metrics array.
     *
     * @return array{cpu: float, ram_used: float, ram_total: float, disk_used: float, disk_total: float}
     */
    private function normaliseMetrics(string $agent, array $raw): array
    {
        if ($agent === 'netdata') {
            $cpu      = 100 - (float) ($raw['system.cpu']['dimensions']['idle']['value'] ?? 100);
            $ramUsed  = (float) ($raw['system.ram']['dimensions']['used']['value'] ?? 0);
            $ramFree  = (float) ($raw['system.ram']['dimensions']['free']['value'] ?? 0);
            $ramTotal = $ramUsed + $ramFree + (float) ($raw['system.ram']['dimensions']['cached']['value'] ?? 0);
            $diskUsed  = (float) ($raw['disk_space./']['dimensions']['used']['value'] ?? 0);
            $diskTotal = $diskUsed + (float) ($raw['disk_space./']['dimensions']['avail']['value'] ?? 1);

            return compact('cpu', 'ramUsed', 'ramTotal', 'diskUsed', 'diskTotal');
        }

        // Glances
        $cpu      = (float) ($raw['cpu']['total'] ?? 0);
        $ramUsed  = (float) ($raw['mem']['used'] ?? 0) / 1024 / 1024;
        $ramTotal = (float) ($raw['mem']['total'] ?? 1) / 1024 / 1024;
        $diskUsed  = 0;
        $diskTotal = 1;
        foreach ($raw['fs'] ?? [] as $fs) {
            $diskUsed  += (float) ($fs['used'] ?? 0);
            $diskTotal += (float) ($fs['size'] ?? 0);
        }
        $diskUsed  /= 1024 * 1024 * 1024;
        $diskTotal /= 1024 * 1024 * 1024;

        return compact('cpu', 'ramUsed', 'ramTotal', 'diskUsed', 'diskTotal');
    }

    public function upgradeServer(Service $service, $settings, $properties)
    {
        if (!isset($properties['server_id'])) {
            throw new Exception('Server does not exist');
        }

        $settings = array_merge($settings, $properties);

        // Get plid from planname
        $plans = $this->request('plans');
        $plid = null;
        foreach ($plans['plans'] as $plan) {
            if ($plan['plan_name'] === $settings['planname']) {
                $plid = $plan['plid'];
                break;
            }
        }
        if (!$plid) {
            throw new Exception('Plan not found');
        }

        $editData = [
            'vpsid' => $properties['server_id'],
            'plid' => $plid,
            'theme_edit' => 1, // Boolean
            'editvps' => 1, // Boolean
        ];

        $response = $this->request('managevps', 'post', $editData);

        if (empty($response['done'])) {
            throw new Exception('Failed to upgrade server');
        }

        return true;
    }
}
