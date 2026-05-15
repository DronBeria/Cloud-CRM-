<?php

namespace Paymenter\Extensions\Others\GoogleDriveBackup\Livewire;

use App\Livewire\Component;
use Illuminate\Support\Facades\Auth;
use Paymenter\Extensions\Others\GoogleDriveBackup\Models\GoogleDriveToken;

class GoogleDriveSettings extends Component
{
    public ?GoogleDriveToken $token = null;
    public bool $isConnected = false;

    public function mount(): void
    {
        $this->token       = GoogleDriveToken::where('user_id', Auth::id())->first();
        $this->isConnected = $this->token !== null;
    }

    public function render()
    {
        return view('gdrive::settings', [
            'token'       => $this->token,
            'isConnected' => $this->isConnected,
        ])->layoutData([
            'title'   => 'Google Drive Backup',
            'sidebar' => true,
        ]);
    }
}
