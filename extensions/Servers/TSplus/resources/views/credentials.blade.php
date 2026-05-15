<div class="p-6 space-y-6">
    <div>
        <h3 class="text-lg font-semibold mb-3">{{ $appName }} — Connection Details</h3>
        <p class="text-sm text-base/60 mb-4">
            Use these details to access your {{ $appName }} environment from any browser. No software installation required.
        </p>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
        {{-- Access URL --}}
        <div class="bg-background-secondary border border-neutral rounded-lg p-4">
            <div class="text-xs font-medium text-base/50 uppercase tracking-wide mb-1">Browser Access URL</div>
            <div class="flex items-center gap-2">
                <a href="{{ $accessUrl }}" target="_blank" rel="noopener noreferrer"
                   class="text-primary font-mono text-sm break-all hover:underline">
                    {{ $accessUrl }}
                </a>
                <button onclick="navigator.clipboard.writeText('{{ $accessUrl }}')"
                        class="text-base/40 hover:text-base/80 flex-shrink-0"
                        title="Copy URL">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                </button>
            </div>
        </div>

        {{-- Windows Username --}}
        <div class="bg-background-secondary border border-neutral rounded-lg p-4">
            <div class="text-xs font-medium text-base/50 uppercase tracking-wide mb-1">Your Login Username</div>
            <div class="flex items-center gap-2">
                <span class="font-mono text-sm">{{ $username }}</span>
                <button onclick="navigator.clipboard.writeText('{{ $username }}')"
                        class="text-base/40 hover:text-base/80 flex-shrink-0"
                        title="Copy username">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    {{-- Password note --}}
    <div class="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-300">
        <span class="font-semibold">Password:</span>
        Your login password was sent in your welcome email when the service was activated.
        If you need a password reset, please open a support ticket.
    </div>

    {{-- How to launch --}}
    <div class="bg-background-secondary border border-neutral rounded-lg p-4">
        <h4 class="font-semibold mb-2 text-sm">How to Launch {{ $appName }}</h4>
        <ol class="list-decimal list-inside space-y-1 text-sm text-base/70">
            <li>Click the <span class="font-semibold text-primary">Launch {{ $appName }}</span> button above — it opens a secure browser session automatically.</li>
            <li>Or open the URL above in any browser and enter your username and password.</li>
            <li>{{ $appName }} will launch inside your browser — no installation required.</li>
            <li>Your company data is saved automatically in your private, isolated data folder.</li>
        </ol>
    </div>

    {{-- Data isolation notice --}}
    <div class="bg-green-600/10 border border-green-500/30 rounded-lg p-4 text-sm text-green-300">
        <span class="font-semibold">Data Security:</span>
        Your {{ $appName }} data is stored in a private, isolated directory on the server.
        OS-level access controls (NTFS ACLs) ensure that only your account can read or write your company files.
    </div>
</div>
