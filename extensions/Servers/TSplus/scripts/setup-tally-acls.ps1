<#
.SYNOPSIS
    Tally Data Directory Isolation Setup for TSplus Multi-Tenant Hosting

.DESCRIPTION
    Run this script on the Windows Server once after onboarding each new customer.
    It creates a private, NTFS-locked data directory for the given Windows username
    so that no other user (or the SYSTEM account in file explorer) can read their data.

    This script is also called automatically by Paymenter via WinRM when WinRM
    credentials are configured in the TSplus extension settings.

.PARAMETER Username
    The Windows username created by the TSplus extension (e.g. tally_42)

.PARAMETER BasePath
    The base data directory configured in the extension (e.g. D:\TallyData)

.EXAMPLE
    .\setup-tally-acls.ps1 -Username tally_42 -BasePath "D:\TallyData"

.NOTES
    Requires: Run as Administrator on the TSplus Windows Server
    The script is idempotent — safe to run multiple times for the same user.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$Username,

    [Parameter(Mandatory=$false)]
    [string]$BasePath = "D:\TallyData"
)

$ErrorActionPreference = "Stop"

$UserPath = Join-Path $BasePath $Username

Write-Host "Setting up isolated Tally directory for: $Username"
Write-Host "Target path: $UserPath"

# ── 1. Create the base data directory if it doesn't exist ────────────────────
if (-not (Test-Path $BasePath)) {
    New-Item -ItemType Directory -Path $BasePath -Force | Out-Null
    Write-Host "Created base directory: $BasePath"
}

# ── 2. Create per-user subdirectory ──────────────────────────────────────────
if (-not (Test-Path $UserPath)) {
    New-Item -ItemType Directory -Path $UserPath -Force | Out-Null
    Write-Host "Created user directory: $UserPath"
} else {
    Write-Host "User directory already exists, updating ACLs..."
}

# ── 3. Lock down ACLs — remove inherited permissions, grant only this user ───
$acl = Get-Acl -Path $UserPath

# Disable ACL inheritance (stop inheriting from parent, remove inherited rules)
$acl.SetAccessRuleProtection($true, $false)

# Remove all existing access rules to start clean
$acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

# Grant the specific user full control (recursive)
$userRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $Username,
    "FullControl",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.SetAccessRule($userRule)

# Grant Administrators full control (so admins can manage/backup data)
$adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "BUILTIN\Administrators",
    "FullControl",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.SetAccessRule($adminRule)

# Apply the ACL
Set-Acl -Path $UserPath -AclObject $acl
Write-Host "NTFS ACLs applied: only '$Username' and Administrators can access $UserPath"

# ── 4. Create a Tally data subfolder inside the user directory ───────────────
$TallyDataSubfolder = Join-Path $UserPath "Company"
if (-not (Test-Path $TallyDataSubfolder)) {
    New-Item -ItemType Directory -Path $TallyDataSubfolder -Force | Out-Null
    Write-Host "Created Tally company data folder: $TallyDataSubfolder"
}

Write-Host ""
Write-Host "SUCCESS: Isolated Tally environment ready for $Username"
Write-Host "  Data path : $UserPath\Company"
Write-Host "  Configure Tally to use this path as the data directory."
Write-Host ""


# ── OPTIONAL: Bulk setup helper ──────────────────────────────────────────────
# To onboard all existing TSplus users at once, uncomment and run:
#
# Get-LocalUser | Where-Object { $_.Name -like "tally_*" } | ForEach-Object {
#     & $PSScriptRoot\setup-tally-acls.ps1 -Username $_.Name -BasePath $BasePath
# }
