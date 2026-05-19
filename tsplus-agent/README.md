# CoCloud TSplus Agent

Runs on your Windows Server. Lets cocloud.in automatically provision
Tally + TSplus accounts when clients pay.

## One-Time Windows Server Setup

### 1. Enable WinRM (PowerShell Remoting)
Open PowerShell as Administrator on your Windows Server:

```powershell
# Enable PowerShell remoting
Enable-PSRemoting -Force

# Allow all hosts (or restrict to your server IP)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force

# Verify
winrm enumerate winrm/config/listener
```

### 2. Create the Tally base directory
```powershell
New-Item -ItemType Directory -Force -Path D:\TallyClients
New-Item -ItemType Directory -Force -Path D:\TallyClients\_accounts
New-Item -ItemType Directory -Force -Path D:\TallyClients\_template
```

### 3. Set up Tally template
Copy your Tally Prime installation into `D:\TallyClients\_template\`
The agent will copy it for each new client automatically.

### 4. Install Node.js
Download from nodejs.org — LTS version (v20+)

### 5. Set up the agent
```cmd
cd C:\CoCloudAgent
npm install
copy .env.example .env
notepad .env     # fill in your API key and paths
```

### 6. Install as Windows Service (runs on boot)
```cmd
# Run as Administrator
npm run install-service
```

### 7. Open Windows Firewall
```powershell
New-NetFirewallRule -DisplayName "CoCloud Agent" -Direction Inbound -Protocol TCP -LocalPort 7820 -Action Allow
```

### 8. Configure in cocloud Admin Panel
Go to Admin → Integrations → TSplus and enter:
- Agent URL: http://YOUR-SERVER-IP:7820
- API Key: (same as AGENT_API_KEY in .env)

## Security Note
For production, put the agent behind Nginx with HTTPS:
```nginx
server {
    listen 443 ssl;
    server_name agent.yourdomain.com;
    location / {
        proxy_pass http://localhost:7820;
    }
}
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check (no auth) |
| GET | /status | Server info + managed user count |
| POST | /provision | Create user + Tally folder |
| POST | /suspend | Disable Windows account |
| POST | /reactivate | Re-enable Windows account |
| DELETE | /provision | Remove user (optionally delete data) |
| GET | /accounts | List all managed accounts |
| POST | /reset-password | Generate new password |
