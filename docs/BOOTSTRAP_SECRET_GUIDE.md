---
title: "Bootstrap Secret Guide"
description: "Understanding and managing KAIZA_BOOTSTRAP_SECRET"
version: "1.0.0"
last_updated: "2026-01-20"
audience: ["developer", "operator", "security"]
---

# Bootstrap Secret Guide

## What Is the Bootstrap Secret?

The **bootstrap secret** (`KAIZA_BOOTSTRAP_SECRET`) is a cryptographic key used to authenticate and authorize the **creation of the first approved plan** in a KAIZA MCP workspace.

### Purpose

The bootstrap secret enables **secure plan creation without requiring a pre-existing approved plan** (the classic bootstrap problem: how do you approve the first plan if plans require approval?).

**The flow:**
1. Fresh KAIZA workspace (no approved plans yet) → bootstrap mode enabled
2. Only the holder of the bootstrap secret can create the first foundation plan
3. That plan is cryptographically signed with the bootstrap secret
4. After first plan created and approved, bootstrap mode disables
5. Future plans require explicit approval (no secret needed)

---

## Technical Details

### How It Works

**Location:** `core/governance.js`

```javascript
// Step 1: Bootstrap secret loaded from environment or file
let secret = process.env.KAIZA_BOOTSTRAP_SECRET;

// Step 2: Plan creation payload is signed with the secret
const hmac = crypto.createHmac("sha256", secret);
hmac.update(JSON.stringify(payload));
const expectedSignature = hmac.digest("hex");

// Step 3: Signature verified using timing-safe comparison
if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error("INVALID_BOOTSTRAP_SIGNATURE");
}

// Step 4: Timestamp check (5-minute window)
if (payload.timestamp && Date.now() - payload.timestamp > 300000) {
    throw new Error("BOOTSTRAP_REQUEST_EXPIRED");
}
```

### Bootstrap Payload Structure

```json
{
  "repoIdentifier": "workspace-root-hash",
  "timestamp": 1705779600000,
  "nonce": "random-string-uuid",
  "action": "BOOTSTRAP_CREATE_FOUNDATION_PLAN",
  "signature": "hmac-sha256-hex-encoded-signature"
}
```

---

## Setting Up the Bootstrap Secret

### Option 1: Environment Variable (Recommended)

```bash
# Generate a random 32-byte secret (base64 encoded)
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)

# Verify it's set
echo $KAIZA_BOOTSTRAP_SECRET
# Output: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7b8C9d0...

# Make permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)' >> ~/.bashrc
source ~/.bashrc
```

### Option 2: File-Based Fallback

If environment variable not set, KAIZA looks for:

```
.kaiza/bootstrap_secret.json
```

File contents:
```json
{
  "bootstrap_secret": "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6..."
}
```

**Setup:**
```bash
mkdir -p .kaiza
echo '{"bootstrap_secret": "'"$(openssl rand -base64 32)"'"}' > .kaiza/bootstrap_secret.json
chmod 600 .kaiza/bootstrap_secret.json  # Restrict to owner only
```

### Option 3: Platform-Specific

**macOS/Linux:**
```bash
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)
```

**Windows PowerShell:**
```powershell
$secret = [Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(24))
$env:KAIZA_BOOTSTRAP_SECRET = $secret
```

---

## Creating the First Plan with Bootstrap Secret

### Workflow

**Step 1: Prepare the Plan**

```json
{
  "name": "foundation-plan",
  "version": "1.0.0",
  "intent": "Initialize governance system with baseline policies",
  "changes": [
    {
      "type": "create",
      "path": "docs/plans/foundation.json",
      "content": "..."
    }
  ]
}
```

**Step 2: Create Bootstrap Payload**

```javascript
const crypto = require('crypto');

const payload = {
  repoIdentifier: "workspace-root",
  timestamp: Date.now(),
  nonce: crypto.randomUUID(),
  action: "BOOTSTRAP_CREATE_FOUNDATION_PLAN"
};

// Sign with bootstrap secret
const secret = process.env.KAIZA_BOOTSTRAP_SECRET;
const hmac = crypto.createHmac("sha256", secret);
hmac.update(JSON.stringify(payload));
const signature = hmac.digest("hex");
```

**Step 3: Call Bootstrap Tool**

In Claude (or MCP client):

```
Call bootstrap_create_foundation_plan with:
  path: /absolute/path/to/workspace
  planContent: [plan JSON from Step 1]
  payload: [payload from Step 2]
  signature: [signature from Step 2]
```

**Success response:**
```json
{
  "status": "PLAN_CREATED",
  "planId": "plan-abc123",
  "planPath": "docs/plans/plan-abc123.json",
  "message": "Plan created by AMP/Antigravity. Bootstrap mode may remain enabled for additional plans."
}
```

---

## Bootstrap Security Model

### What Bootstrap Protects Against

✅ **Unauthorized plan creation** (only holder of secret can create first plan)  
✅ **Replay attacks** (5-minute timestamp window prevents old signatures being reused)  
✅ **Signature forgery** (HMAC-SHA256 + timing-safe comparison)  
✅ **Tampering** (payload signature verification detects any modification)

### What Bootstrap Does NOT Protect Against

❌ **Exposed secrets** (if secret leaked, attacker can create plans—see mitigation below)  
❌ **Timing attacks on the secret itself** (side-channel attacks on HMAC key)  
❌ **Man-in-the-middle after bootstrap** (once bootstrap disabled, use standard plan approval)

### Threat Model

| Threat | Bootstrap Secret Protection | Additional Mitigation |
|--------|------------------------------|----------------------|
| **Unauthorized plan creation** | ✅ Secret required | Rotate secret after bootstrap |
| **Replay of old signatures** | ✅ Timestamp window (5 min) | Synchronize server clocks |
| **Signature forgery** | ✅ HMAC-SHA256 verification | Use strong secrets (32+ bytes) |
| **Secret exposure** | ⚠️ Compromised | Revoke secret, recreate plans with new secret |
| **Insider threat** | ⚠️ Secret holder can abuse | Use environment variable (not file), rotate regularly |

---

## Secret Management Best Practices

### ✅ DO

- **Generate with cryptographic randomness:**
  ```bash
  openssl rand -base64 32  # 32 bytes = 256 bits
  ```

- **Store in environment variable (not code):**
  ```bash
  export KAIZA_BOOTSTRAP_SECRET="..."  # Good
  ```

- **Restrict file permissions if using file fallback:**
  ```bash
  chmod 600 .kaiza/bootstrap_secret.json
  ```

- **Rotate after successful bootstrap:**
  ```bash
  # Change the secret, delete old plans if needed, recreate
  unset KAIZA_BOOTSTRAP_SECRET
  rm .kaiza/bootstrap_secret.json
  ```

- **Use different secrets per environment:**
  ```
  Dev:   KAIZA_BOOTSTRAP_SECRET_DEV
  Staging: KAIZA_BOOTSTRAP_SECRET_STAGING
  Prod:  KAIZA_BOOTSTRAP_SECRET_PROD  ← Highly restricted
  ```

### ❌ DON'T

- **Hardcode secret in code:**
  ```javascript
  // WRONG
  const secret = "A1b2C3d4...";  // Never do this
  ```

- **Commit to git:**
  ```bash
  # Add to .gitignore
  echo ".kaiza/bootstrap_secret.json" >> .gitignore
  echo "KAIZA_BOOTSTRAP_SECRET*" >> .gitignore
  ```

- **Share via email/chat:**
  ```
  ❌ "Here's the secret: A1b2C3..."
  ✅ "Set it locally; I'll send via secure channel"
  ```

- **Use weak/predictable secrets:**
  ```
  ❌ "password123"
  ✅ "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2..."
  ```

- **Log the secret:**
  ```javascript
  // WRONG
  console.log("Secret: " + process.env.KAIZA_BOOTSTRAP_SECRET);
  ```

---

## Troubleshooting

### Problem: "BOOTSTRAP_SECRET_MISSING"

**Cause:** Environment variable not set and no fallback file exists.

**Fix:**
```bash
# Set it explicitly
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)

# Or verify it's set
echo $KAIZA_BOOTSTRAP_SECRET

# If empty, set in shell config
echo 'export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)' >> ~/.bashrc
source ~/.bashrc
```

### Problem: "INVALID_BOOTSTRAP_SIGNATURE"

**Cause:** Signature doesn't match (wrong secret, corrupted payload, or timing issue).

**Fix:**
1. Verify secret is consistent:
   ```bash
   echo $KAIZA_BOOTSTRAP_SECRET
   # Should output the same value
   ```

2. Check payload hasn't been modified (whitespace, order, etc.)

3. Verify timestamp is within 5-minute window:
   ```bash
   date +%s  # Current Unix timestamp
   # Compare to payload.timestamp (should be within 300 seconds)
   ```

### Problem: "BOOTSTRAP_REQUEST_EXPIRED"

**Cause:** Signature is older than 5 minutes.

**Fix:**
```bash
# Create new payload with current timestamp
const newPayload = {
  ...oldPayload,
  timestamp: Date.now()  // Update to now
};

# Regenerate signature with new timestamp
```

### Problem: "BOOTSTRAP_DISABLED"

**Cause:** Workspace already has approved plans; bootstrap mode is off.

**Fix:**
- This is expected behavior (bootstrap only works on first plan)
- To create more plans, use standard plan approval workflow
- Secret is no longer needed after bootstrap

---

## Lifecycle: From Bootstrap to Production

### Phase 1: Bootstrap (First Plan)
```
Secret required → First plan created → Approved → Bootstrap disabled
```

**During this phase:**
- Only holder of secret can create plans
- Timestamp window enforced (5 min)
- HMAC signature verified

### Phase 2: Normal Operations (Subsequent Plans)
```
Plans created → Approval required → Execution → Audit trail
```

**During this phase:**
- Secret not needed (bootstrap disabled)
- Standard plan approval workflow
- No time constraints

### Decommissioning Bootstrap Secret

After successful bootstrap (first plan created):

```bash
# Option 1: Clear environment variable
unset KAIZA_BOOTSTRAP_SECRET

# Option 2: Delete fallback file
rm .kaiza/bootstrap_secret.json

# Option 3: Archive (keep for audit trail)
cp .kaiza/bootstrap_secret.json .kaiza/bootstrap_secret.json.archived.2026-01-20
rm .kaiza/bootstrap_secret.json
```

---

## Audit & Verification

### Verify Bootstrap Was Successful

Check the first approved plan:

```bash
# List plans
cat docs/plans/foundation-plan.json

# Verify plan hash
sha256sum docs/plans/foundation-plan.json
```

Check audit log:

```bash
# Look for bootstrap creation entry
grep "bootstrap" audit-log.jsonl

# Should show:
# {
#   "tool": "bootstrap_create_foundation_plan",
#   "status": "success",
#   "plan_hash": "...",
#   "timestamp": "2026-01-20T..."
# }
```

### Verify Bootstrap Is Disabled

```bash
# Check governance state
cat .kaiza/governance.json

# Should show:
# {
#   "bootstrap_enabled": false,
#   "approved_plans_count": 1
# }
```

---

## Secret Rotation

**When to rotate:**
- After successful bootstrap
- Suspected exposure/compromise
- Periodic rotation policy (e.g., quarterly)
- Team member departure

**How to rotate:**

1. **Generate new secret:**
   ```bash
   NEW_SECRET=$(openssl rand -base64 32)
   ```

2. **Update environment:**
   ```bash
   export KAIZA_BOOTSTRAP_SECRET=$NEW_SECRET
   ```

3. **Verify new secret works (test in staging):**
   ```bash
   # Create a test plan with new secret
   ```

4. **Remove old secret:**
   ```bash
   unset KAIZA_BOOTSTRAP_SECRET  # or update .bashrc
   rm .kaiza/bootstrap_secret.json
   ```

5. **Audit trail:**
   ```bash
   # Log the rotation
   echo "Bootstrap secret rotated: $(date)" >> .kaiza/audit.log
   ```

---

## FAQ

**Q: Can I use the same secret for multiple workspaces?**

A: Yes, but not recommended. Use different secrets per environment:
```
Dev workspace: SECRET_A
Staging workspace: SECRET_B
Prod workspace: SECRET_C
```

**Q: What if I lose the bootstrap secret?**

A: If lost after bootstrap is disabled, it doesn't matter (bootstrap is disabled). If lost before bootstrap, you cannot create the first plan—you'd need to recreate the environment or manually seed the governance state.

**Q: Is the secret ever transmitted over the network?**

A: No. The secret stays local (environment variable or file). Only the signed payload and signature are transmitted to KAIZA.

**Q: Can I use a passphrase instead of random bytes?**

A: Not recommended. Passphrases are weaker. Use `openssl rand -base64 32` for cryptographic randomness.

**Q: How often should I rotate the secret?**

A: After successful bootstrap, it can be disabled and not used again. If kept active, rotate quarterly or on policy change.

---

## Related Documents

- [SAFETY_AND_DATA_HANDLING.md](./SAFETY_AND_DATA_HANDLING.md) — Secret management best practices
- [ABSOLUTE_BEGINNER_GUIDE.md](./guides/ABSOLUTE_BEGINNER_GUIDE.md) — Setup instructions for beginners
- [core/governance.js](../core/governance.js) — Implementation details
- [tools/bootstrap_tool.js](../tools/bootstrap_tool.js) — Bootstrap tool source

---

**Document Owner:** KAIZA MCP Security Team  
**Last Updated:** 2026-01-20  
**Version:** 1.0.0
