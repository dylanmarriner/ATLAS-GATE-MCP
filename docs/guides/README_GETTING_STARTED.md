# KAIZA MCP Server: Getting Started

**Welcome!** This document guides you to the right resources for what you need to do.

---

## What Do You Want to Do?

### 🚀 "I want to get started RIGHT NOW"
→ Read: **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** (5 minutes)
- Installation one-liner
- Tool overview table
- Common errors & fixes
- Keep this on your desk

---

### 📚 "I want a complete setup guide with examples"
→ Read: **[COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)** (30 minutes)
- Step-by-step installation
- Each tool explained with examples
- Example prompts that work
- Workflows and troubleshooting

---

### 📊 "I want to understand what was done to harden this system"
→ Read: **[HARDENING_SUMMARY.md](HARDENING_SUMMARY.md)** (10 minutes)
- What issues were found
- What was fixed
- Test results
- Quality assurance

---

### 🔐 "I want to understand how zero-setup works"
→ Read: **[ZERO_SETUP_GUARANTEE.md](ZERO_SETUP_GUARANTEE.md)** (15 minutes)
- How it works in any directory
- Auto-creation of directories
- Bootstrap mode explanation
- Why zero setup is possible

---

### 📋 "I want complete technical details and verification"
→ Read: **[FINAL_VERIFICATION_REPORT.md](FINAL_VERIFICATION_REPORT.md)** (20 minutes)
- All issues found and fixed
- Global invariants verified
- Code quality assessment
- Risk assessment
- Deployment checklist

---

### 🔍 "I want to find specific documentation"
→ Read: **[HARDENING_INDEX.md](HARDENING_INDEX.md)** (5 minutes)
- Complete documentation index
- Links to all resources
- Quick links table

---

## Quick Overview

### What is KAIZA MCP Server?

KAIZA is a Model Context Protocol (MCP) server that enforces governance on code generation by AI agents. It:

- ✅ **Works anywhere** - No setup required, works in any directory
- ✅ **Enforces quality** - Rejects stub code, TODOs, mocks
- ✅ **Audits changes** - Hash-chained immutable audit log
- ✅ **Requires plans** - All writes must be authorized by plans
- ✅ **Prevents bypass** - Hard-blocks policy violations

### Who Should Use This?

- 🤖 Teams using AI agents for code generation
- 🏢 Enterprises needing governance on autonomous coding
- 🔒 Anyone who wants quality-enforced writes
- 📋 Projects requiring audit trails

### How Does It Work?

```
Agent ─── MCP Request ──→ KAIZA Server
                            ↓
                        Validate Input
                            ↓
                        Check Plan Approval
                            ↓
                        Scan for Stubs
                            ↓
                        Write to Filesystem
                            ↓
                        Append to Audit Log
                            ↓
Agent ←─── MCP Response ─── Confirmation
```

---

## Installation (Ultra-Quick)

```bash
# 1. Clone
git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
cd KAIZA-MCP-server

# 2. Install & Test
npm install && npm test

# 3. Set secret
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)

# 4. Run
node server.js
```

**That's it.** Now you can use all 6 tools.

---

## The 6 Tools

| Tool | Purpose | Example |
|------|---------|---------|
| **read_prompt** | Unlock governance context | Before any write |
| **list_plans** | Find available plans | Get plan name for writes |
| **read_file** | Examine code | Understand before modifying |
| **write_file** | Create/modify code | Main operation |
| **read_audit_log** | Verify changes | Confirm what was written |
| **bootstrap_*** | Create first plan | One-time setup |

---

## Typical Workflow

### Step 1: Read Governance
```
Agent: Call read_prompt()
System: Governance requirements unlocked
```

### Step 2: Find Plan
```
Agent: Call list_plans()
System: Shows available plans
```

### Step 3: Check Current Code
```
Agent: Call read_file("src/main.js")
System: Shows current implementation
```

### Step 4: Make Changes
```
Agent: Call write_file(
  path: "src/main.js",
  plan: "FOUNDATION-xxxxx",
  content: "improved code"
)
System: Validates → Writes → Audits
```

### Step 5: Verify
```
Agent: Call read_audit_log()
System: Shows exact change recorded
```

---

## What Gets Blocked?

These patterns are **HARD-BLOCKED** (no exceptions):

❌ TODO/FIXME comments  
❌ Empty functions or catch blocks  
❌ Returning null, undefined, or empty strings  
❌ Mock, fake, or test data patterns  
❌ Syntax errors or unparseable code  
❌ Path traversal attempts  

**Why?** Production code must be complete, real, and secure.

---

## What's Allowed?

These patterns are **ALWAYS ALLOWED**:

✅ `return true;` in validation functions  
✅ Real data structures (userData, apiResponse, items)  
✅ Error throwing for invalid states  
✅ Complete production code  
✅ Proper security practices  

---

## Common Questions

### Q: Do I need to configure anything?
**A:** Only set `KAIZA_BOOTSTRAP_SECRET` environment variable. Everything else is automatic.

### Q: Will it work in my repo structure?
**A:** Yes. Works in any directory, auto-detects repo root, creates directories as needed.

### Q: Can I use it with my IDE?
**A:** Yes, if your IDE supports MCP protocol (Windsurf, VSCode with Cline, etc.)

### Q: What happens if I try to write bad code?
**A:** It gets rejected with a clear error message. You fix the code and retry.

### Q: Can I bypass the plan requirement?
**A:** No. Plan enforcement is absolute. All writes require an approved plan.

### Q: Is the audit log secure?
**A:** Yes. Hash-chained, immutable, impossible to modify without detection.

### Q: What if I make a mistake?
**A:** Only the mistake is written. Previous files untouched. You can fix it with another write.

---

## Getting Help

### Installation Issues?
→ **COMPLETE_SETUP_GUIDE.md** § Prerequisites section

### Tool Not Working?
→ **COMPLETE_SETUP_GUIDE.md** § Tool Usage Guide section

### Code Getting Rejected?
→ **COMPLETE_SETUP_GUIDE.md** § Troubleshooting section

### Want Examples?
→ **COMPLETE_SETUP_GUIDE.md** § Example Workflows section

### Technical Questions?
→ **FINAL_VERIFICATION_REPORT.md** § Technical details

---

## Document Map

```
START HERE
    ↓
README_GETTING_STARTED.md (this file)
    ↓
Choose your path:
    ├─→ QUICK_REFERENCE.md (5 min) → Start using immediately
    ├─→ COMPLETE_SETUP_GUIDE.md (30 min) → Learn in detail
    ├─→ HARDENING_SUMMARY.md (10 min) → Understand the system
    └─→ ZERO_SETUP_GUARANTEE.md (15 min) → Learn how zero-setup works
    
Advanced (if needed):
    ├─→ FINAL_VERIFICATION_REPORT.md (Technical details)
    ├─→ HARDENING_INDEX.md (Document index)
    └─→ AUDIT_FINDINGS.md (Issues found & fixed)
```

---

## Recommended Reading Order

### For Quick Start (15 minutes)
1. README_GETTING_STARTED.md (this file) ← You are here
2. QUICK_REFERENCE.md
3. Start using the system

### For Complete Understanding (1 hour)
1. README_GETTING_STARTED.md (this file)
2. COMPLETE_SETUP_GUIDE.md
3. HARDENING_SUMMARY.md
4. ZERO_SETUP_GUARANTEE.md

### For Deep Technical Knowledge (2 hours)
1. All of the above, plus:
2. FINAL_VERIFICATION_REPORT.md
3. AUDIT_FINDINGS.md
4. HARDENING_INDEX.md

---

## Success Criteria

You'll know you're ready when you can:

✅ Clone and install the repo  
✅ Start the server without errors  
✅ Call `read_prompt` to unlock writes  
✅ Call `list_plans` to see available plans  
✅ Call `write_file` to create code  
✅ Call `read_audit_log` to verify changes  
✅ Understand why code gets rejected  
✅ Know how to fix rejected code  

---

## Your First 10 Minutes

```
1. Clone (1 min)
   git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git

2. Install (2 min)
   cd KAIZA-MCP-server && npm install

3. Test (1 min)
   npm test

4. Set secret (1 min)
   export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)

5. Run (continuous)
   node server.js

6. Read quick ref (2 min)
   Open QUICK_REFERENCE.md
   
7. Try first tool (3 min)
   Call read_prompt() in your IDE
   You're live!
```

---

## Key Principles

1. **Zero Setup** - Works in any directory without configuration
2. **Zero Accidental Errors** - Only policy violations throw errors
3. **Deterministic** - Identical behavior everywhere
4. **Secure** - Cryptographically protected audit trail
5. **Enforcing** - Impossible to bypass quality gates

---

## What's Different About KAIZA?

Most MCP servers are **passive tools**. KAIZA is an **enforcement authority**.

| Aspect | Other MCP Servers | KAIZA |
|--------|-------------------|-------|
| Code Quality | Allowed | Enforced |
| Authorization | Optional | Required |
| Audit Trail | None | Immutable |
| Zero Setup | Often needs config | Always works |
| Bypass Possible | Yes | No |

---

## Ready to Get Started?

### Pick Your Path:

**Option A: Just Want to Use It**
```
→ QUICK_REFERENCE.md
→ Start using
```

**Option B: Want to Understand Everything**
```
→ COMPLETE_SETUP_GUIDE.md
→ HARDENING_SUMMARY.md
→ Start using
```

**Option C: Want Technical Details**
```
→ FINAL_VERIFICATION_REPORT.md
→ HARDENING_INDEX.md
→ Technical deep dive
```

---

## Support Resources

- **[COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)** - Most comprehensive
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Keep handy
- **[ZERO_SETUP_GUARANTEE.md](ZERO_SETUP_GUARANTEE.md)** - How it works
- **[FINAL_VERIFICATION_REPORT.md](FINAL_VERIFICATION_REPORT.md)** - Technical
- **[HARDENING_INDEX.md](HARDENING_INDEX.md)** - Find anything

---

## Next Step

**Right now, go read:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (5 minutes)

Then come back here and click through to the next document.

---

**You've got this. Let's build with confidence. 🚀**

