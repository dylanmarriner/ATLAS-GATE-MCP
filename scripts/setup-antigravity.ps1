param(
    [switch]$Force
)

# KAIZA MCP - Antigravity Setup Script (PowerShell)
# This script automates the setup process for writing plans with Antigravity

$ErrorActionPreference = "Stop"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "KAIZA MCP Antigravity Setup" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if script is run from repo root
if (-not (Test-Path "package.json")) {
    Write-Host "Error: script must be run from repository root" -ForegroundColor Red
    Write-Host "Run: cd C:\path\to\KAIZA-MCP-server; .\setup-antigravity.ps1"
    exit 1
}

# Step 1: Check Node.js
Write-Host "Step 1: Check Node.js installation" -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    Write-Host "Install from https://nodejs.org/"
    exit 1
}
Write-Host ""

# Step 2: Install dependencies
Write-Host "Step 2: Install dependencies" -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "Node modules already installed" -ForegroundColor Yellow
} else {
    Write-Host "Installing npm packages..."
    npm install | Out-Null
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}
Write-Host ""

# Step 3: Generate bootstrap secret
Write-Host "Step 3: Generate bootstrap secret" -ForegroundColor Cyan
Write-Host ""

$bootstrapSecret = $env:KAIZA_BOOTSTRAP_SECRET
if ([string]::IsNullOrEmpty($bootstrapSecret)) {
    Write-Host "Generating a cryptographically random 32-byte secret..."
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $bytes = New-Object byte[](24)
    $rng.GetBytes($bytes)
    $bootstrapSecret = [Convert]::ToBase64String($bytes)
    $rng.Dispose()
} else {
    Write-Host "Bootstrap secret already set in environment" -ForegroundColor Yellow
}

$secretDisplay = $bootstrapSecret.Substring(0, [Math]::Min(8, $bootstrapSecret.Length)) + "..."
Write-Host "Bootstrap Secret (first 8 chars): $secretDisplay" -ForegroundColor Green
Write-Host ""

# Step 4: Create .env file
Write-Host "Step 4: Create .env file" -ForegroundColor Cyan

if ((Test-Path ".env") -and -not $Force) {
    Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Copy-Item ".env.example" ".env" -Force
        # Update the secret
        $envContent = Get-Content ".env" -Raw
        $envContent = $envContent -replace "KAIZA_BOOTSTRAP_SECRET=.*", "KAIZA_BOOTSTRAP_SECRET=$bootstrapSecret"
        $envContent | Set-Content ".env"
        Write-Host "✓ .env file created" -ForegroundColor Green
        # Set file permissions (Windows)
        icacls ".env" /inheritance:r /grant:r "$env:USERNAME`:(F)" | Out-Null
        Write-Host "✓ .env permissions restricted" -ForegroundColor Green
    } else {
        Write-Host "Keeping existing .env file" -ForegroundColor Yellow
        # Try to read existing secret
        $existing = Select-String "KAIZA_BOOTSTRAP_SECRET=(.+)" ".env" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }
        if ($existing) {
            $bootstrapSecret = $existing
        }
    }
} else {
    Copy-Item ".env.example" ".env" -Force
    # Update the secret
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace "KAIZA_BOOTSTRAP_SECRET=.*", "KAIZA_BOOTSTRAP_SECRET=$bootstrapSecret"
    $envContent | Set-Content ".env"
    Write-Host "✓ .env file created" -ForegroundColor Green
    # Set file permissions (Windows)
    icacls ".env" /inheritance:r /grant:r "$env:USERNAME`:(F)" | Out-Null
    Write-Host "✓ .env permissions restricted" -ForegroundColor Green
}
Write-Host ""

# Step 5: Load environment
Write-Host "Step 5: Load environment" -ForegroundColor Cyan
$env:KAIZA_BOOTSTRAP_SECRET = $bootstrapSecret
Write-Host "✓ Bootstrap secret loaded into environment" -ForegroundColor Green
Write-Host ""

# Step 6: Run verification suite
Write-Host "Step 6: Run verification suite" -ForegroundColor Cyan
Write-Host "Running npm run verify..."
$verifyOutput = npm run verify 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All verification tests passed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some verification tests failed" -ForegroundColor Yellow
    Write-Host "Run 'npm run verify' to see details"
}
Write-Host ""

Write-Host "===========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Load the environment in your PowerShell:"
Write-Host "   `$env:KAIZA_BOOTSTRAP_SECRET = '$(Get-Content .env | Select-String 'KAIZA_BOOTSTRAP_SECRET=' | ForEach-Object { $_.Line -replace 'KAIZA_BOOTSTRAP_SECRET=' })'`n"
Write-Host "   Or use the .env file: $(Resolve-Path .env)"
Write-Host ""
Write-Host "2. Verify Antigravity can access KAIZA:"
Write-Host "   node bin\kaiza-mcp-antigravity.js"
Write-Host ""
Write-Host "3. Configure Antigravity client with MCP server:"
Write-Host "   Add to your Antigravity config file:"
Write-Host "   {`n     ""mcpServers"": {`n       ""kaiza"": {`n         ""command"": ""node"",`n         ""args"": [""$(Resolve-Path bin\kaiza-mcp-antigravity.js)""],`n         ""type"": ""stdio""`n       }`n     }`n   }"
Write-Host ""
Write-Host "4. Start writing plans! Use the MCP tools in Antigravity:"
Write-Host "   - bootstrap_create_foundation_plan (first plan only)"
Write-Host "   - create_plan (subsequent plans)"
Write-Host "   - list_plans"
Write-Host "   - validate_plan"
Write-Host ""
Write-Host "For more information:"
Write-Host "   - ANTIGRAVITY_SETUP.md (setup guide)"
Write-Host "   - docs\BOOTSTRAP_SECRET_GUIDE.md (bootstrap details)"
Write-Host "   - docs\MCP_QUICK_REFERENCE.md (MCP tools reference)"
Write-Host ""
