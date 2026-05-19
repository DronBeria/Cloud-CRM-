/**
 * CloudCRM TSplus Agent
 * Runs on the Windows Server. Accepts HTTPS requests from CloudCRM (Vercel)
 * and executes PowerShell commands to manage TSplus/Windows users.
 *
 * Setup: node server.js
 * Install as Windows Service: node install-service.js
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { execSync, exec } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.AGENT_API_KEY || "change-this-secret-key";
const PORT = process.env.PORT || 7820;
const TALLY_BASE_PATH = process.env.TALLY_BASE_PATH || "D:\\TallyClients";
const TSPLUS_SERVER = process.env.TSPLUS_SERVER_URL || "https://your-tsplus-server.com";

// ── Auth Middleware ────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const key = req.headers["x-api-key"] || req.body?.apiKey;
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── PowerShell Helper ─────────────────────────────────────────────────────────
function ps(command) {
  return execSync(
    `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`,
    { encoding: "utf8", shell: true }
  ).trim();
}

function psAsync(command) {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`,
      { encoding: "utf8" },
      (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout.trim());
      }
    );
  });
}

function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length }, () => chars[crypto.randomInt(chars.length)]).join("");
}

function sanitizeUsername(serviceId) {
  // Windows username: max 20 chars, no special chars
  return `cc_${serviceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: TSPLUS_SERVER, tallyPath: TALLY_BASE_PATH });
});

// Test connection (with auth)
app.get("/status", auth, (req, res) => {
  try {
    const hostname = ps("$env:COMPUTERNAME");
    const osInfo = ps("(Get-CimInstance Win32_OperatingSystem).Caption");
    const users = ps(
      `(Get-LocalUser | Where-Object { $_.Name -like 'cc_*' } | Measure-Object).Count`
    );
    res.json({
      ok: true,
      hostname,
      os: osInfo,
      managedUsers: parseInt(users) || 0,
      tallyBasePath: TALLY_BASE_PATH,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Provision: create Windows user + folder + Tally setup
app.post("/provision", auth, async (req, res) => {
  const { serviceId, clientName, planName, sessions = 1 } = req.body;

  if (!serviceId || !clientName) {
    return res.status(400).json({ error: "serviceId and clientName required" });
  }

  const username = sanitizeUsername(serviceId);
  const password = generatePassword();
  const tallyPath = path.join(TALLY_BASE_PATH, serviceId);
  const dataPath = path.join(tallyPath, "data");
  const tallyExePath = path.join(tallyPath, "tally.exe");

  try {
    // 1. Create Windows local user
    await psAsync(`
      $pass = ConvertTo-SecureString '${password}' -AsPlainText -Force;
      New-LocalUser -Name '${username}' -Password $pass -FullName '${clientName}' -Description 'CloudCRM Service ${serviceId}' -PasswordNeverExpires -UserMayNotChangePassword;
      Add-LocalGroupMember -Group 'Remote Desktop Users' -Member '${username}';
    `);

    // 2. Create Tally directory structure
    fs.mkdirSync(dataPath, { recursive: true });

    // 3. Set NTFS permissions — only this user + Administrators
    await psAsync(`
      $path = '${tallyPath.replace(/\\/g, "\\\\")}';
      $acl = Get-Acl $path;
      $acl.SetAccessRuleProtection($true, $false);
      $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule('Administrators','FullControl','ContainerInherit,ObjectInherit','None','Allow');
      $userRule  = New-Object System.Security.AccessControl.FileSystemAccessRule('${username}','FullControl','ContainerInherit,ObjectInherit','None','Allow');
      $acl.AddAccessRule($adminRule);
      $acl.AddAccessRule($userRule);
      Set-Acl -Path $path -AclObject $acl;
    `);

    // 4. Copy Tally template (if a template exists at TALLY_BASE_PATH\_template\)
    const templatePath = path.join(TALLY_BASE_PATH, "_template");
    if (fs.existsSync(templatePath)) {
      await psAsync(`
        Copy-Item -Path '${templatePath.replace(/\\/g, "\\\\")}\\*' -Destination '${tallyPath.replace(/\\/g, "\\\\")}' -Recurse -Force;
      `);
    }

    // 5. Create Tally config pointing to client's data folder
    const tallyIniContent = `[TallyConfiguration]\r\nDataPath=${dataPath}\r\nPort=9000\r\n`;
    fs.writeFileSync(path.join(tallyPath, "Tally.ini"), tallyIniContent);

    // 6. Store provisioning info in a local JSON file
    const infoFile = path.join(TALLY_BASE_PATH, "_accounts", `${serviceId}.json`);
    fs.mkdirSync(path.dirname(infoFile), { recursive: true });
    fs.writeFileSync(
      infoFile,
      JSON.stringify({
        serviceId,
        username,
        password,
        tallyPath,
        dataPath,
        clientName,
        planName,
        sessions,
        provisionedAt: new Date().toISOString(),
        status: "active",
      })
    );

    res.json({
      success: true,
      username,
      password,
      tallyPath,
      dataPath,
      launchUrl: `${TSPLUS_SERVER}/?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&remoteapp=tally.exe`,
      serverUrl: TSPLUS_SERVER,
    });
  } catch (e) {
    console.error("[Provision Error]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Suspend: disable Windows account
app.post("/suspend", auth, async (req, res) => {
  const { serviceId } = req.body;
  const username = sanitizeUsername(serviceId);

  try {
    await psAsync(`Disable-LocalUser -Name '${username}'`);
    updateAccountFile(serviceId, { status: "suspended" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reactivate: enable Windows account
app.post("/reactivate", auth, async (req, res) => {
  const { serviceId } = req.body;
  const username = sanitizeUsername(serviceId);

  try {
    await psAsync(`Enable-LocalUser -Name '${username}'`);
    updateAccountFile(serviceId, { status: "active" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete: remove user (optionally keep data)
app.delete("/provision", auth, async (req, res) => {
  const { serviceId, deleteData = false } = req.body;
  const username = sanitizeUsername(serviceId);
  const tallyPath = path.join(TALLY_BASE_PATH, serviceId);

  try {
    // Log off any active sessions first
    try { await psAsync(`query session /server:localhost | findstr '${username}' | ForEach-Object { logoff ($_.Split()[0]) }`); }
    catch { /* no active sessions */ }

    await psAsync(`Remove-LocalUser -Name '${username}'`);

    if (deleteData && fs.existsSync(tallyPath)) {
      fs.rmSync(tallyPath, { recursive: true, force: true });
    }

    const infoFile = path.join(TALLY_BASE_PATH, "_accounts", `${serviceId}.json`);
    if (fs.existsSync(infoFile)) fs.unlinkSync(infoFile);

    res.json({ success: true, dataDeleted: deleteData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get account info (for admin)
app.get("/account/:serviceId", auth, (req, res) => {
  const { serviceId } = req.params;
  const infoFile = path.join(TALLY_BASE_PATH, "_accounts", `${serviceId}.json`);

  if (!fs.existsSync(infoFile)) {
    return res.status(404).json({ error: "Account not found" });
  }

  const info = JSON.parse(fs.readFileSync(infoFile, "utf8"));
  // Mask password in response
  res.json({ ...info, password: "***" });
});

// List all managed accounts
app.get("/accounts", auth, (req, res) => {
  const accountsDir = path.join(TALLY_BASE_PATH, "_accounts");
  if (!fs.existsSync(accountsDir)) return res.json([]);

  const accounts = fs
    .readdirSync(accountsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const info = JSON.parse(fs.readFileSync(path.join(accountsDir, f), "utf8"));
      return { ...info, password: "***" };
    });

  res.json(accounts);
});

// Reset password
app.post("/reset-password", auth, async (req, res) => {
  const { serviceId } = req.body;
  const username = sanitizeUsername(serviceId);
  const newPassword = generatePassword();

  try {
    await psAsync(
      `$pass = ConvertTo-SecureString '${newPassword}' -AsPlainText -Force; Set-LocalUser -Name '${username}' -Password $pass`
    );
    updateAccountFile(serviceId, { password: newPassword });
    res.json({ success: true, password: newPassword });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helper Functions ──────────────────────────────────────────────────────────
function updateAccountFile(serviceId, updates) {
  const infoFile = path.join(TALLY_BASE_PATH, "_accounts", `${serviceId}.json`);
  if (!fs.existsSync(infoFile)) return;
  const info = JSON.parse(fs.readFileSync(infoFile, "utf8"));
  fs.writeFileSync(infoFile, JSON.stringify({ ...info, ...updates, updatedAt: new Date().toISOString() }));
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[CloudCRM TSplus Agent] Running on port ${PORT}`);
  console.log(`[CloudCRM TSplus Agent] Tally base path: ${TALLY_BASE_PATH}`);
  console.log(`[CloudCRM TSplus Agent] TSplus server: ${TSPLUS_SERVER}`);
});
