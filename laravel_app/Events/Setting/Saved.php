<?php

namespace App\Events\Setting;

use App\Classes\Settings;
use App\Models\Setting;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;

class Saved
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Setting $setting)
    {
        if ($setting->settingable_type === null) {
            $cSetting = Settings::getSetting($setting->key);
            $settings = config('settings', []);
            $settings[$setting->key] = $setting->value;
            Config::set('settings', $settings);

            if (isset($cSetting->override) && config("settings.$cSetting->name") !== null) {
                Config::set($cSetting->override, config("settings.$cSetting->name"));
            }
        }
    }
}
