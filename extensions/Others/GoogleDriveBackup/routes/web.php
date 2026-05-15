<?php

use Illuminate\Support\Facades\Route;
use Paymenter\Extensions\Others\GoogleDriveBackup\Http\Controllers\GoogleDriveController;
use Paymenter\Extensions\Others\GoogleDriveBackup\Livewire\GoogleDriveSettings;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    // Settings page — Livewire component
    Route::get('/account/google-drive', GoogleDriveSettings::class)->name('gdrive.settings');

    // OAuth flow
    Route::get('/google-drive/connect',  [GoogleDriveController::class, 'redirect'])->name('gdrive.connect');
    Route::get('/google-drive/callback', [GoogleDriveController::class, 'callback'])->name('gdrive.callback');
    Route::post('/google-drive/disconnect', [GoogleDriveController::class, 'disconnect'])
        ->name('gdrive.disconnect')
        ->middleware('throttle:5,1');
});
