---
title: "Safety & Data Handling Guide"
description: "How to avoid leaking secrets, handle API keys safely, and maintain data privacy"
version: "1.0.0"
last_updated: "2026-01-20"
audience: ["all", "security-conscious"]
---

# Safety & Data Handling Guide

How to use KAIZA MCP securely without accidentally leaking secrets, exposing API keys, or compromising sensitive data.

---

## Table of Contents

1. [Quick Safety Checklist](#quick-safety-checklist)
2. [Secret Management](#secret-management)
3. [API Key Safety](#api-key-safety)
4. [Safe Defaults](#safe-defaults)
5. [What KAIZA Stores](#what-kaiza-stores)
6. [Incident Recovery](#incident-recovery)
7. [Privacy & Compliance](#privacy--compliance)

---

## Quick Safety Checklist

Use this checklist before committing code or sharing work:

- [ ] **No secrets in git**: Verify `.env` and other secret files are in `.gitignore`
- [ ] **No hardcoded passwords**: Check code doesn't contain plain-text credentials
- [ ] **No API keys in logs**: Review audit logs don't accidentally capture sensitive values
- [ ] **No PII in plans**: Plans shouldn't contain personal information (names, emails, etc.)
- [ ] **Audit log checked**: Review who executed what, and approve all entries
- [ ] **Secrets rotated**: If exposed, regenerate API keys immediately
- [ ] **Plan reviewed**: Always review a plan before execution to catch unintended changes

---

## Secret Management

### What Is a Secret?

**Secrets** are credentials you need to hide:
- Database passwords
- API keys
- OAuth tokens
- SSH keys
- Private encryption keys
- Authentication credentials

### Safe Secret Storage

#### ✅ DO Use Environment Variables

```javascript
// In your code
const apiKey = process.env.STRIPE_API_KEY;
const dbPassword = process.env.DB_PASSWORD;
```

#### Create a `.env` File

1. Create `.env` in your project root:
   ```bash
   touch .env
   ```

2. Add secrets:
   ```
   STRIPE_API_KEY=sk_live_1234567890abcdef
   DATABASE_PASSWORD=MySecurePassword123!
   GITHUB_TOKEN=ghp_abcdefghijklmnop
   ```

3. Add to `.gitignore` to prevent uploading:
   ```bash
   echo ".env" >> .gitignore
   ```

4. Load in your code (Node.js):
   ```javascript
   import dotenv from 'dotenv';
   dotenv.config();
   
   const apiKey = process.env.STRIPE_API_KEY;
   ```

#### ❌ DO NOT Do This

```javascript
// ❌ WRONG: Secret hardcoded in code
const apiKey = "sk_live_1234567890abcdef";

// ❌ WRONG: Secret in comment
// Database password: MySecurePassword123!

// ❌ WRONG: Secret in config file committed to git
// config.json
{
  "apiKey": "sk_live_1234567890abcdef"
}
```

### Secret Rotation (If Exposed)

**If you accidentally expose a secret:**

1. **Immediately revoke it** (in Stripe dashboard, GitHub settings, AWS console, etc.)
2. **Generate a new secret**
3. **Update your `.env` file** with the new secret
4. **Redeploy** your application
5. **Check git history** to verify the old secret isn't in any commits
   ```bash
   git log --all -p | grep -i "sk_live"
   ```
6. **If found in git history:**
   - Use a tool like BFG Repo Cleaner or git-filter-branch to remove it
   - Force-push to repository
   - Notify team members to re-clone

---

## API Key Safety

### Types of API Keys

| Type | Example | Should Hide? | Where to Store |
|------|---------|--------------|-----------------|
| **Private API Key** | `sk_live_123...` | ✅ YES | `.env` file |
| **Public API Key** | `pk_live_abc...` | ❌ NO | Safe to put in code |
| **OAuth Token** | `ghp_abc123...` | ✅ YES | `.env` file |
| **Bearer Token** | `Bearer abc123...` | ✅ YES | `.env` file |
| **SSH Key** | `-----BEGIN RSA PRIVATE KEY-----` | ✅ YES | `~/.ssh/` |

### API Key Usage Patterns

#### Safe: Use Environment Variable

```javascript
import fetch from 'node-fetch';

const stripeKey = process.env.STRIPE_API_KEY;

async function chargeCustomer(amount) {
  const response = await fetch('https://api.stripe.com/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
  return response.json();
}
```

#### Unsafe: Don't Paste Keys Directly

```javascript
// ❌ WRONG: API key is in the code
const stripeKey = 'sk_live_1234567890abcdef';
```

#### Unsafe: Don't Put Keys in Plans

When creating a KAIZA plan, don't include actual API keys:

```
❌ WRONG:
Plan: Add Stripe integration
Details: Add API key 'sk_live_1234567890abcdef' to config

✅ RIGHT:
Plan: Add Stripe integration
Details: Add Stripe API key from .env variable
```

### Key Scoping (Least Privilege)

Create API keys with minimal necessary permissions:

**Example: Stripe keys**

Instead of one "all-powerful" key, create:
- `STRIPE_TEST_KEY` (for development)
- `STRIPE_LIVE_KEY_CHARGES` (can only create charges, not refunds)
- `STRIPE_LIVE_KEY_WEBHOOKS` (restricted webhook signing)

**Example: GitHub tokens**

Instead of a full-access PAT, create:
- Token with `repo` scope only (not admin)
- Token with `read:packages` only (not write)
- Separate token per integration (database client, CI/CD, etc.)

---

## Safe Defaults

### Principle: Least Privilege

**Give only the minimum necessary permission.** Default to "No" and grant explicitly.

### File Permissions

Set restrictive permissions for sensitive files:

```bash
# Make .env readable only by you
chmod 600 .env

# Make SSH key readable only by you
chmod 600 ~/.ssh/id_rsa

# Make public keys readable by everyone, writable only by you
chmod 644 ~/.ssh/id_rsa.pub

# Make directories readable/writable only by you
chmod 700 ~/.ssh/
```

**Verify permissions:**

```bash
ls -la
# Output: -rw------- (600) means owner can read/write, others can't
```

### Database Credentials

**Database URL format:**

```
# Safe: Use environment variable
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Then in code:
const dbUrl = process.env.DATABASE_URL;
```

**Never:**
- Commit database URLs to git
- Share database passwords in chat/email
- Use the same password for dev and production
- Use weak passwords (use a password manager to generate strong ones)

### OAuth & Third-Party Credentials

**Pattern:**

```javascript
// Safe: Load from environment
const googleOAuthSecret = process.env.GOOGLE_OAUTH_SECRET;
const googleOAuthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

// Use in authentication flow
app.get('/auth/google', (req, res) => {
  const redirectUri = generateGoogleAuthUrl(
    googleOAuthClientId,
    googleOAuthSecret
  );
  res.redirect(redirectUri);
});
```

**Never:**
- Hardcode Client IDs or Secrets
- Use personal OAuth tokens for apps (create app-specific ones)
- Share OAuth credentials across teams (create separate apps per environment)

---

## What KAIZA Stores

### Data KAIZA Logs

✅ **Audit Trail** (Safe to store):
- Timestamp of each operation
- Tool called (write_file, read_file, etc.)
- File paths modified
- Role (Antigravity, Windsurf)
- Hash of content changed (but not the content itself in some cases)
- Success/error status

### Data KAIZA DOES NOT Log (Safe)

❌ **KAIZA doesn't capture:**
- Your `.env` file contents (environment variables)
- API keys (unless you put them in a file KAIZA modifies)
- Private thoughts in your prompts (only what Claude sends to KAIZA tools)
- Keyboard input or clipboard
- Network traffic to third parties

### Audit Log Privacy

**KAIZA audit logs are:**
- Stored locally (not sent to external services)
- Append-only (cannot be retroactively deleted)
- Accessible only to whoever has access to the folder

**KAIZA audit logs contain:**
- File operations (which files were changed)
- Metadata (timestamps, roles, session info)
- Plan hashes (not secret, just identifiers)

**Example audit entry:**
```json
{
  "timestamp": "2026-01-20T15:30:00Z",
  "tool": "write_file",
  "file": "/home/user/project/src/main.js",
  "session_id": "abc123...",
  "role": "WINDSURF",
  "status": "success"
}
```

This is fine—it doesn't expose secrets.

### What NOT to Store in KAIZA

Don't use KAIZA to manage:
- ❌ SSH private keys (use ssh-keygen, store in `~/.ssh/`)
- ❌ Database passwords (use `.env` + password manager)
- ❌ OAuth tokens (use environment variables)
- ❌ PII (Personally Identifiable Information: SSN, email, phone, address)
- ❌ Configuration with embedded secrets (separate secrets to `.env`)

---

## Audit Log Review

### Checking What Happened

**View recent audit log entries:**

```bash
tail -20 audit-log.jsonl
```

**Search for a specific file:**

```bash
grep "src/main.js" audit-log.jsonl
```

**Check who made changes:**

```bash
grep -i "windsurf" audit-log.jsonl | grep "success"
```

### Suspicious Activity

Watch for:
- ⚠️ Changes to `.env` or config files
- ⚠️ Large number of file deletions
- ⚠️ Changes outside your planned scope
- ⚠️ Failed operations (might indicate an attack)
- ⚠️ Operations at unusual times (if you didn't authorize them)

### Taking Action

If you see suspicious activity:

1. **Stop using KAIZA** (shut down your session)
2. **Review the changes** (check what was modified)
3. **Rollback if needed** (use git to undo: `git reset --hard`)
4. **Rotate secrets** (if any were exposed, regenerate them immediately)
5. **Investigate** (check audit log for patterns)
6. **Report** (if compromised, report in security.md contact)

---

## Safe Practices Checklist

### Before Each Session

- [ ] Review your `.env` file is in `.gitignore`
- [ ] Verify you're using environment variables for secrets
- [ ] Check that your authentication token (for MCP client) is secure
- [ ] Confirm your workspace folder has appropriate file permissions

### Before Creating a Plan

- [ ] Plan doesn't include actual API keys or passwords
- [ ] Plan doesn't contain PII (names, emails, addresses, SSNs)
- [ ] Plan is specific enough to audit (not vague)
- [ ] Plan doesn't modify sensitive files like `.env` or SSH keys

### Before Executing a Plan

- [ ] Read the full plan text (understand what will change)
- [ ] Verify file paths are correct (not changing unintended files)
- [ ] Check that you authorized this plan (it should match your intent)
- [ ] Confirm audit logs will capture the changes

### After Execution

- [ ] Review audit log to verify what actually happened
- [ ] Check git diff to see the actual changes (use `git diff`)
- [ ] Verify files look correct (open and review them)
- [ ] Commit changes to git with a clear message

---

## Privacy & Compliance

### Data Residency

**KAIZA stores data:**
- Locally in your workspace folder
- Not sent to external servers (unless you configure it)
- Accessible only to users with access to the folder

**If you deploy KAIZA to a server:**
- Audit logs remain on that server
- Server security is your responsibility
- Consider encryption at rest
- Implement access controls (who can SSH to the server)

### Compliance Requirements

**If you handle:**
- **GDPR data** (EU residents): Audit logs might contain user identifiers—ensure you can delete them upon request
- **HIPAA data** (healthcare): Audit logs must be encrypted, access-controlled, and retained per regulations
- **PCI-DSS data** (credit cards): Don't store card data in KAIZA; use tokenized payment processor
- **SOC 2**: KAIZA helps with SOC 2 compliance (audit trails, access control)

**Best practice:** Consult your compliance officer before using KAIZA with regulated data.

### User Privacy

**If using KAIZA in a team:**
- Inform team members that changes are logged and auditable
- Be transparent about who has access to audit logs
- Don't use KAIZA logs to spy on developers (use for security, not surveillance)
- Comply with employment laws in your jurisdiction

---

## Incident Response

### "I Accidentally Committed a Secret"

1. **Immediately revoke the secret** (GitHub → Settings → Developer → Regenerate Token)
2. **Remove from git history** (if it's in git):
   ```bash
   # Option 1: Remove from last commit
   git reset HEAD~1
   git reset src/config.js  # Unstage the file with the secret
   git add . && git commit -m "Remove secret from config"
   git push origin main --force-with-lease
   
   # Option 2: Full history cleanup (more complex)
   # See https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
   ```
3. **Update `.env`** with new secret
4. **Notify your team** (someone may have cloned the repo with the exposed secret)
5. **Monitor for misuse** (check if the exposed key was used elsewhere)

### "Someone Executed an Unauthorized Plan"

1. **Immediately lock down** (stop using KAIZA, change any exposed credentials)
2. **Review audit log** (understand what was changed)
3. **Use git to rollback** (undo the changes)
4. **Investigate** (check how the plan was created—who authorized it)
5. **Report** (contact security team or maintainers)
6. **Change credentials** (API keys, database passwords, etc. that might be compromised)

### "I'm Worried About Security"

Report security concerns:
- 📧 **Email:** security@kaiza-mcp.org
- 🐛 **GitHub Issue:** [Security report](https://github.com/dylanmarriner/KAIZA-MCP-server/security/advisories)
- 💬 **Discussion:** [GitHub Discussions - Security](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions/categories/security)

---

## Quick Reference: Safe Commands

### Generate a Strong Password

```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(24))
```

### Create `.env` Safely

```bash
# Create file readable only by you
touch .env
chmod 600 .env

# Add secret (use your editor)
echo "API_KEY=your-secret-here" >> .env
```

### Check if Secret is in Git

```bash
# Search git history for API key pattern
git log --all -p | grep -i "api_key"

# Search for common secret patterns
git grep -i "password\|secret\|api_key\|token" -- ':!*.md'
```

### Rotate a Secret

```bash
# 1. Generate new secret (from your provider's dashboard)
# 2. Update .env
nano .env
# 3. Test with new secret
npm run test
# 4. Deploy
npm run deploy
# 5. Revoke old secret in provider dashboard
```

---

## Further Reading

- [KAIZA Security Policy](../SECURITY.md)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [dotenv library documentation](https://github.com/motdotla/dotenv)

---

**Document Owner:** KAIZA MCP Security Team  
**Last Updated:** 2026-01-20  
**Version:** 1.0.0

Remember: **The best security is boring security.** Use standard tools (.env, password managers, environment variables) and follow best practices. Don't reinvent the wheel.
