<div class="container mt-14">
    {{-- Flash messages --}}
    @if(session('success'))
    <div class="mb-4 bg-green-600/20 border-l-4 border-green-500 text-green-300 p-4 rounded-lg">
        {{ session('success') }}
    </div>
    @endif
    @if(session('error'))
    <div class="mb-4 bg-red-600/20 border-l-4 border-red-500 text-red-300 p-4 rounded-lg">
        {{ session('error') }}
    </div>
    @endif

    <div class="bg-background-secondary border border-neutral p-6 rounded-lg">
        <h1 class="text-2xl font-semibold mb-1">Google Drive Backup</h1>
        <p class="text-base/60 text-sm mb-6">
            Connect your Google account to automatically back up your Tally company data to your own Google Drive every night.
            Your data stays yours — we only write to a dedicated backup folder, nothing else is accessed.
        </p>

        @if($isConnected)
        {{-- ── Connected state ───────────────────────────────────────────── --}}
        <div class="flex items-start gap-4 bg-green-600/10 border border-green-500/30 rounded-lg p-5 mb-6">
            <div class="text-green-400 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <div>
                <div class="font-semibold text-green-300">Google Drive Connected</div>
                <div class="text-sm text-green-400/70 mt-1">
                    @if($token->last_backup_at)
                        Last backup: {{ $token->last_backup_at->diffForHumans() }}
                        ({{ $token->last_backup_at->format('M d, Y H:i') }})
                    @else
                        No backup run yet. The first backup will run tonight.
                    @endif
                </div>
                @if($token->folder_id)
                <div class="text-sm text-green-400/70 mt-0.5">
                    Backup folder:
                    <a href="https://drive.google.com/drive/folders/{{ $token->folder_id }}"
                       target="_blank" rel="noopener noreferrer"
                       class="underline hover:text-green-300">
                        Open in Drive ↗
                    </a>
                </div>
                @endif
            </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-6">
            <div class="bg-background-secondary border border-neutral rounded-lg p-4">
                <div class="text-xs text-base/50 uppercase tracking-wide mb-1">Backup Schedule</div>
                <div class="font-medium">Nightly (automatic)</div>
                <div class="text-sm text-base/50 mt-0.5">Compressed, encrypted ZIP uploaded to your Drive</div>
            </div>
            <div class="bg-background-secondary border border-neutral rounded-lg p-4">
                <div class="text-xs text-base/50 uppercase tracking-wide mb-1">Data Scope</div>
                <div class="font-medium">Your Tally company folder only</div>
                <div class="text-sm text-base/50 mt-0.5">No access to other files in your Drive</div>
            </div>
        </div>

        <form action="{{ route('gdrive.disconnect') }}" method="POST">
            @csrf
            <button type="submit"
                    onclick="return confirm('Disconnect Google Drive? Future backups will be paused. Your existing backups in Drive will not be deleted.')"
                    class="px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg text-sm hover:bg-red-600/30 transition">
                Disconnect Google Drive
            </button>
        </form>

        @else
        {{-- ── Not connected state ───────────────────────────────────────── --}}
        <div class="space-y-4 mb-8">
            <div class="flex items-start gap-3">
                <div class="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                    <div class="font-medium text-sm">Connect your Google account</div>
                    <div class="text-sm text-base/50">One-click OAuth — no passwords shared with us</div>
                </div>
            </div>
            <div class="flex items-start gap-3">
                <div class="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                    <div class="font-medium text-sm">We create a "Paymenter Tally Backups" folder in your Drive</div>
                    <div class="text-sm text-base/50">All backups go here — nothing else is touched</div>
                </div>
            </div>
            <div class="flex items-start gap-3">
                <div class="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                    <div class="font-medium text-sm">Your Tally data is backed up every night automatically</div>
                    <div class="text-sm text-base/50">7 days of backups retained; older ones are auto-deleted from Drive</div>
                </div>
            </div>
        </div>

        <a href="{{ route('gdrive.connect') }}"
           class="inline-flex items-center gap-3 px-5 py-3 bg-white text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition shadow">
            {{-- Google logo SVG --}}
            <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect with Google
        </a>

        <p class="text-xs text-base/30 mt-4">
            We only request the
            <code class="font-mono">drive.file</code>
            scope — permission to manage files that this app creates.
            We cannot read any of your existing Drive files.
        </p>
        @endif
    </div>
</div>
