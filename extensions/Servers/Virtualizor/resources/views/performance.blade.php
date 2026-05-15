<div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Live Performance Metrics</h3>
        @if($vmIp)
        <span class="text-xs text-base/50 font-mono">{{ $vmIp }}</span>
        @endif
    </div>

    @if($error)
    {{-- ── Metrics unavailable ─────────────────────────────────────────── --}}
    <div class="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-300">
        <span class="font-semibold">Metrics Unavailable</span><br>
        {{ $error }}
        <div class="mt-3 text-yellow-400/70 text-xs">
            To enable live metrics, install
            <a href="https://learn.netdata.cloud/docs/installing/windows" target="_blank"
               rel="noopener noreferrer" class="underline">Netdata</a>
            or
            <a href="https://nicolargo.github.io/glances/" target="_blank"
               rel="noopener noreferrer" class="underline">Glances</a>
            inside your Windows VM golden image.
        </div>
    </div>

    @else
    {{-- ── Live metric bars ────────────────────────────────────────────── --}}

    @php
        $cpuPct   = min(100, round($metrics['cpu'], 1));
        $ramPct   = $metrics['ramTotal'] > 0 ? min(100, round($metrics['ramUsed'] / $metrics['ramTotal'] * 100, 1)) : 0;
        $diskPct  = $metrics['diskTotal'] > 0 ? min(100, round($metrics['diskUsed'] / $metrics['diskTotal'] * 100, 1)) : 0;

        $cpuColor  = $cpuPct  > 85 ? 'bg-red-500'    : ($cpuPct  > 60 ? 'bg-yellow-500' : 'bg-green-500');
        $ramColor  = $ramPct  > 85 ? 'bg-red-500'    : ($ramPct  > 60 ? 'bg-yellow-500' : 'bg-blue-500');
        $diskColor = $diskPct > 85 ? 'bg-red-500'    : ($diskPct > 70 ? 'bg-yellow-500' : 'bg-purple-500');
    @endphp

    <div class="grid md:grid-cols-3 gap-4">

        {{-- CPU --}}
        <div class="bg-background-secondary border border-neutral rounded-lg p-4">
            <div class="flex justify-between text-sm mb-2">
                <span class="font-medium">CPU Usage</span>
                <span class="font-mono font-semibold {{ $cpuPct > 85 ? 'text-red-400' : ($cpuPct > 60 ? 'text-yellow-400' : 'text-green-400') }}">
                    {{ $cpuPct }}%
                </span>
            </div>
            <div class="w-full bg-neutral/30 rounded-full h-3 overflow-hidden">
                <div class="{{ $cpuColor }} h-3 rounded-full transition-all duration-700"
                     style="width: {{ $cpuPct }}%"></div>
            </div>
            <div class="text-xs text-base/40 mt-2">
                @if($cpuPct > 85) High load — consider upgrading plan
                @elseif($cpuPct > 60) Moderate load
                @else Normal
                @endif
            </div>
        </div>

        {{-- RAM --}}
        <div class="bg-background-secondary border border-neutral rounded-lg p-4">
            <div class="flex justify-between text-sm mb-2">
                <span class="font-medium">Memory</span>
                <span class="font-mono font-semibold {{ $ramPct > 85 ? 'text-red-400' : ($ramPct > 60 ? 'text-yellow-400' : 'text-blue-400') }}">
                    {{ $ramPct }}%
                </span>
            </div>
            <div class="w-full bg-neutral/30 rounded-full h-3 overflow-hidden">
                <div class="{{ $ramColor }} h-3 rounded-full transition-all duration-700"
                     style="width: {{ $ramPct }}%"></div>
            </div>
            <div class="text-xs text-base/40 mt-2">
                {{ number_format($metrics['ramUsed'], 0) }} MB
                /
                {{ number_format($metrics['ramTotal'], 0) }} MB
            </div>
        </div>

        {{-- Disk --}}
        <div class="bg-background-secondary border border-neutral rounded-lg p-4">
            <div class="flex justify-between text-sm mb-2">
                <span class="font-medium">Disk Storage</span>
                <span class="font-mono font-semibold {{ $diskPct > 85 ? 'text-red-400' : ($diskPct > 70 ? 'text-yellow-400' : 'text-purple-400') }}">
                    {{ $diskPct }}%
                </span>
            </div>
            <div class="w-full bg-neutral/30 rounded-full h-3 overflow-hidden">
                <div class="{{ $diskColor }} h-3 rounded-full transition-all duration-700"
                     style="width: {{ $diskPct }}%"></div>
            </div>
            <div class="text-xs text-base/40 mt-2">
                {{ number_format($metrics['diskUsed'], 1) }} GB
                /
                {{ number_format($metrics['diskTotal'], 1) }} GB
            </div>
        </div>

    </div>

    {{-- Auto-refresh every 15 seconds --}}
    <div class="text-xs text-base/30 text-right">
        Auto-refreshes every 15 s &nbsp;·&nbsp; Last update: <span id="perf-ts">{{ now()->format('H:i:s') }}</span>
    </div>
    <script>
        (function() {
            function refreshPerformance() {
                // Trigger Livewire to re-render the current view tab
                if (window.Livewire) {
                    window.Livewire.all().forEach(function(c) {
                        if (typeof c.call === 'function') {
                            try { c.call('changeView', 'performance'); } catch(e) {}
                        }
                    });
                }
                document.getElementById('perf-ts').textContent = new Date().toLocaleTimeString();
            }
            setTimeout(function loop() {
                refreshPerformance();
                setTimeout(loop, 15000);
            }, 15000);
        })();
    </script>
    @endif
</div>
