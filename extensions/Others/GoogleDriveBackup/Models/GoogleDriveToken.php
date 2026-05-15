<?php

namespace Paymenter\Extensions\Others\GoogleDriveBackup\Models;

use Illuminate\Database\Eloquent\Model;

class GoogleDriveToken extends Model
{
    protected $table = 'ext_google_drive_tokens';

    protected $fillable = [
        'user_id',
        'access_token',
        'refresh_token',
        'expires_at',
        'folder_id',
        'last_backup_at',
    ];

    protected $casts = [
        'last_backup_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
