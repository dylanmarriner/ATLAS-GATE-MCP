# Setup Bootstrap Secret for KAIZA MCP (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-bootstrap.ps1

param(
    [switch]$SkipConfirm = $false
)

Write-Host "=========================================="
Write-Host "KAIZA MCP Bootstrap Secret Setup" -ForegroundColor Green
Write-Host "=========================================="
Write-Host ""

# Check if script is run from repo root
if (-not (Test-Path "package.json")) {
    Write-Host "Error: script must be run from repository root" -ForegroundColor Red
    Write-Host "Run: cd C:\path\to\KAIZA-MCP-server"
    Write-Host "Then: powershell -ExecutionPolicy Bypass -File scripts/setup-bootstrap.ps1"
    exit 1
}

Write-Host "Step 1: Check current bootstrap secret status"
Write-Host ""

$currentSecret = $env:KAIZA_BOOTSTRAP_SECRET

if ([string]::IsNullOrEmpty($currentSecret)) {
    Write-Host "⚠️  No KAIZA_BOOTSTRAP_SECRET in current environment" -ForegroundColor Yellow
    $bootstrapSecret = $null
} else {
    Write-Host "✓ KAIZA_BOOTSTRAP_SECRET is already set" -ForegroundColor Green
    if (-not $SkipConfirm) {
        $response = Read-Host "Do you want to regenerate it? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Write-Host "Generating new secret..."
            $bootstrapSecret = [Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(24))
        } else {
            $bootstrapSecret = $currentSecret
        }
    } else {
        $bootstrapSecret = $currentSecret
    }
}

if ([string]::IsNullOrEmpty($bootstrapSecret)) {
    Write-Host ""
    Write-Host "Step 2: Generating bootstrap secret"
    Write-Host ""
    Write-Host "Generating a cryptographically random 32-byte secret..."
    
    try {
        $bootstrapSecret = [Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(24))
    } catch {
        Write-Host "Error: Failed to generate secret" -ForegroundColor Red
        Write-Host "Details: $_"
        exit 1
    }
}

Write-Host ""
Write-Host "Generated Bootstrap Secret:"
Write-Host $bootstrapSecret -ForegroundColor Green
Write-Host ""

# Ask how to store it
Write-Host "Step 3: How would you like to store the secret?"
Write-Host ""
Write-Host "1) Environment variable (User environment)"
Write-Host "2) .env file (for this project)"
Write-Host "3) .kaiza/bootstrap_secret.json file (fallback)"
Write-Host "4) Copy to clipboard only (manual setup)"
Write-Host ""

$choice = Read-Host "Choose option (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Setting environment variable for current user..."
        Write-Host ""
        
        try {
            [Environment]::SetEnvironmentVariable("KAIZA_BOOTSTRAP_SECRET", $bootstrapSecret, "User")
            Write-Host "✓ Environment variable set" -ForegroundColor Green
            Write-Host ""
            Write-Host "Open a new PowerShell window for the change to take effect"
            Write-Host ""
        } catch {
            Write-Host "Error setting environment variable: $_" -ForegroundColor Red
            exit 1
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Creating .env file..."
        Write-Host ""
        
        $envFile = ".env"
        
        if (Test-Path $envFile) {
            Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
            $response = Read-Host "Overwrite? (y/n)"
            if ($response -ne 'y' -and $response -ne 'Y') {
                Write-Host "Skipping .env file creation"
                exit 0
            }
        }
        
        # Create or update .env file
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
        }
        
        # Write the secret
        $envContent = "# KAIZA MCP Environment Configuration`r`nKAIZA_BOOTSTRAP_SECRET=$bootstrapSecret`r`n"
        Set-Content -Path ".env" -Value $envContent
        
        Write-Host "✓ .env file created" -ForegroundColor Green
        Write-Host ""
        Write-Host "Load the .env file before running KAIZA:"
        Write-Host "  # In PowerShell:"
        Write-Host "  Get-Content .env | ForEach-Object { `$parts = `$_ -split '='; if (`$parts.Length -eq 2) { `[Environment]::SetEnvironmentVariable(`$parts[0], `$parts[1]) } }"
        Write-Host "  npm run server"
        Write-Host ""
    }
    "3" {
        Write-Host ""
        Write-Host "Creating .kaiza/bootstrap_secret.json..."
        Write-Host ""
        
        if (-not (Test-Path ".kaiza")) {
            New-Item -ItemType Directory -Path ".kaiza" | Out-Null
        }
        
        $secretFile = ".kaiza/bootstrap_secret.json"
        
        if (Test-Path $secretFile) {
            Write-Host "⚠️  File already exists" -ForegroundColor Yellow
            $response = Read-Host "Overwrite? (y/n)"
            if ($response -ne 'y' -and $response -ne 'Y') {
                Write-Host "Skipping file creation"
                exit 0
            }
        }
        
        # Create JSON
        $json = @{
            bootstrap_secret = $bootstrapSecret
        } | ConvertTo-Json
        
        Set-Content -Path $secretFile -Value $json
        
        Write-Host "✓ .kaiza/bootstrap_secret.json created" -ForegroundColor Green
        Write-Host ""
        
        # Add to .gitignore if not already there
        if (Test-Path ".gitignore") {
            $gitignore = Get-Content ".gitignore"
            if ($gitignore -notcontains ".kaiza/bootstrap_secret.json") {
                Add-Content ".gitignore" ".kaiza/bootstrap_secret.json"
                Write-Host "✓ Added to .gitignore" -ForegroundColor Green
            }
        }
        Write-Host ""
    }
    "4" {
        Write-Host ""
        Write-Host "Copy this secret and paste where needed:"
        Write-Host ""
        Write-Host $bootstrapSecret -ForegroundColor Green
        Write-Host ""
        Write-Host "To use it, set the environment variable:"
        Write-Host "  `$env:KAIZA_BOOTSTRAP_SECRET = '$bootstrapSecret'"
        Write-Host ""
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Step 4: Verify setup"
Write-Host ""

# Set in current session
$env:KAIZA_BOOTSTRAP_SECRET = $bootstrapSecret

if ([string]::IsNullOrEmpty($env:KAIZA_BOOTSTRAP_SECRET)) {
    Write-Host "✗ Bootstrap secret not set" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Bootstrap secret is set" -ForegroundColor Green
$secretLength = $bootstrapSecret.Length
$firstEight = $bootstrapSecret.Substring(0, [Math]::Min(8, $secretLength))
Write-Host "  Length: $secretLength characters"
Write-Host "  First 8 chars: $firstEight..."
Write-Host ""

Write-Host "=========================================="
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Verify the secret is loaded in your environment"
Write-Host "2. Run: npm run verify"
Write-Host "3. Create your first plan with bootstrap_create_foundation_plan"
Write-Host ""
Write-Host "For more information, see:"
Write-Host "  - docs/BOOTSTRAP_SECRET_GUIDE.md"
Write-Host "  - docs/guides/ABSOLUTE_BEGINNER_GUIDE.md"
Write-Host ""
