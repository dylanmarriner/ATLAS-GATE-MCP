# Bootstrap Secret Setup: Quick Start

## TL;DR

```bash
# 1. Run setup script (recommended)
bash scripts/setup-bootstrap.sh              # macOS/Linux
powershell -File scripts/setup-bootstrap.ps1 # Windows

# 2. Verify
echo $KAIZA_BOOTSTRAP_SECRET

# 3. You're done! The secret is set up.
```

---

## Step-by-Step

### For macOS/Linux Users

**Step 1: Run the setup script**
```bash
cd /path/to/KAIZA-MCP-server
bash scripts/setup-bootstrap.sh
```

**What it does:**
- ✅ Generates a random 32-byte cryptographic secret
- ✅ Asks how you want to store it (environment variable, .env file, or JSON file)
- ✅ Sets up the secret automatically
- ✅ Verifies it's working

**Step 2: Follow the prompts**
- Choose option 1 (shell environment) for easiest setup
- Or choose option 2 (.env file) to store per-project

**Step 3: Verify**
```bash
echo $KAIZA_BOOTSTRAP_SECRET
# Output: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6...
```

---

### For Windows Users

**Step 1: Open PowerShell**

Right-click PowerShell → "Run as Administrator"

**Step 2: Run the setup script**
```powershell
cd C:\path\to\KAIZA-MCP-server
powershell -ExecutionPolicy Bypass -File scripts/setup-bootstrap.ps1
```

**Step 3: Follow the prompts**
- Choose option 1 (User environment variable) for easiest setup
- Open a new PowerShell window for changes to take effect

**Step 4: Verify**
```powershell
echo $env:KAIZA_BOOTSTRAP_SECRET
# Output: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6...
```

---

## Manual Setup (If You Prefer)

### macOS/Linux

```bash
# Generate a random secret
SECRET=$(openssl rand -base64 32)

# Option A: Set in current session
export KAIZA_BOOTSTRAP_SECRET=$SECRET

# Option B: Add to ~/.bashrc or ~/.zshrc (permanent)
echo "export KAIZA_BOOTSTRAP_SECRET='$SECRET'" >> ~/.bashrc
source ~/.bashrc

# Option C: Create .env file
echo "KAIZA_BOOTSTRAP_SECRET=$SECRET" > .env
source .env  # Load before running KAIZA

# Option D: Create .kaiza/bootstrap_secret.json
mkdir -p .kaiza
echo "{\"bootstrap_secret\": \"$SECRET\"}" > .kaiza/bootstrap_secret.json
chmod 600 .kaiza/bootstrap_secret.json
```

### Windows PowerShell

```powershell
# Generate a random secret
$secret = [Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(24))

# Option A: Set for current session
$env:KAIZA_BOOTSTRAP_SECRET = $secret

# Option B: Set for all future sessions (User environment)
[Environment]::SetEnvironmentVariable("KAIZA_BOOTSTRAP_SECRET", $secret, "User")

# Option C: Create .env file
"KAIZA_BOOTSTRAP_SECRET=$secret" | Set-Content -Path ".env"

# Option D: Create .kaiza/bootstrap_secret.json
New-Item -ItemType Directory -Path ".kaiza" -Force | Out-Null
@{ bootstrap_secret = $secret } | ConvertTo-Json | Set-Content -Path ".kaiza/bootstrap_secret.json"
```

---

## Verify It's Working

### Check if secret is set

```bash
# macOS/Linux
echo $KAIZA_BOOTSTRAP_SECRET

# Windows PowerShell
echo $env:KAIZA_BOOTSTRAP_SECRET
```

**Success:** You see a long string of random characters  
**Failure:** No output (secret not set)

### Test with KAIZA

```bash
npm run verify
```

If verification passes, your bootstrap secret is ready!

---

## Common Issues

### "Command not found: openssl"

**On macOS:** Install Xcode Command Line Tools
```bash
xcode-select --install
```

**On Linux:** Install openssl
```bash
sudo apt-get install openssl  # Debian/Ubuntu
sudo yum install openssl      # RedHat/CentOS
```

**On Windows:** Use built-in PowerShell (script uses `RNGCryptoServiceProvider`)

---

### "Permission denied" running setup script

```bash
chmod +x scripts/setup-bootstrap.sh
bash scripts/setup-bootstrap.sh
```

---

### Secret not persisting after closing terminal

**Problem:** You set the secret in current terminal, but it's gone when you open a new one.

**Solution:** Make it permanent:
```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export KAIZA_BOOTSTRAP_SECRET="your-secret-here"' >> ~/.bashrc
source ~/.bashrc

# Or create .env file
echo 'KAIZA_BOOTSTRAP_SECRET=your-secret-here' > .env
```

---

## Next Steps

1. ✅ Set up the bootstrap secret (you are here)
2. 📖 Read [docs/BOOTSTRAP_SECRET_GUIDE.md](./docs/BOOTSTRAP_SECRET_GUIDE.md) for full details
3. 🚀 Follow [docs/guides/ABSOLUTE_BEGINNER_GUIDE.md](./docs/guides/ABSOLUTE_BEGINNER_GUIDE.md) to create your first plan
4. ⚙️ Configure your MCP client (Claude Desktop, Windsurf, etc.)

---

## Files Created/Modified

- ✅ `.env.example` — Example environment configuration
- ✅ `scripts/setup-bootstrap.sh` — Automated setup for macOS/Linux
- ✅ `scripts/setup-bootstrap.ps1` — Automated setup for Windows
- ✅ `README.md` — Updated with bootstrap setup section
- ✅ `docs/BOOTSTRAP_SECRET_GUIDE.md` — Complete reference guide

---

**Questions?** See [docs/BOOTSTRAP_SECRET_GUIDE.md](./docs/BOOTSTRAP_SECRET_GUIDE.md) or [docs/GLOSSARY.md](./docs/GLOSSARY.md)
