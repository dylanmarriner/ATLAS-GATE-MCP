# Beginner's Guide: Using ATLAS-GATE-MCP

*This guide assumes you've never used ATLAS-GATE-MCP before and may have limited technical experience. We'll start with the basics and build up from there.*

---

## Table of Contents

1. [What You'll Learn](#what-youll-learn)
2. [Before You Start](#before-you-start)
3. [Core Concepts](#core-concepts)
4. [Installation (The Easy Way)](#installation-the-easy-way)
5. [Your First Operation](#your-first-operation)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## What You'll Learn

By the end of this guide, you'll understand:

- ✓ What ATLAS-GATE-MCP is and why you need it
- ✓ How to install it on your computer
- ✓ How to configure it for your project
- ✓ How to use it in your daily workflow
- ✓ How to read the audit logs (who did what and when)

---

## Before You Start

### **Prerequisites**

You need:
- A computer with **Node.js 18 or newer** installed
  - Check by opening terminal/command prompt and typing: `node --version`
  - If you don't have it: [Download Node.js](https://nodejs.org/)
- **Git** installed (for version control)
  - Check by typing: `git --version`
  - If needed: [Download Git](https://git-scm.com/)
- A text editor (VS Code, Sublime Text, or similar)
- Basic comfort with command-line/terminal

### **Time Estimate**

- Installation: 5-10 minutes
- Configuration: 10-15 minutes
- First operation: 5 minutes
- **Total: About 30 minutes to get started**

---

## Core Concepts

Before diving into installation, let's understand the three main ideas:

### **1. Plans (Authorization Documents)**

A "Plan" is like a purchase order. Before the AI can do important work, someone says: "Yes, we approve this work. Here's the plan."

**Real example:**
```
Plan: Update README.md

Status: APPROVED
Approved by: Team Lead
Content: Update documentation to reflect v2.0 features
Scope: Only modifications to README.md
Created: 2026-02-04
```

The AI reads this and thinks: "OK, I'm allowed to modify the README because this plan approves it."

### **2. Roles (Two Types of AI Permissions)**

ATLAS-GATE-MCP knows about two different AI "roles":

| Role | Can Do | Use Case |
|------|--------|----------|
| **Windsurf** | Read AND Write | Doing actual work (coding, writing docs) |
| **Antigravity** | Read Only | Planning and analysis (no changes allowed) |

Think of it like:
- **Windsurf**: Editor with a pen (can change things)
- **Antigravity**: Editor with a highlighter (can only mark things, not change)

### **3. Audit Logs (The Safety Record)**

Every action is recorded in a log. It's like a security camera that never forgets:

```
2026-02-04 14:30:45 | File Write | README.md | 
  User: AI (Windsurf) | 
  Plan: plan-001 | 
  Size: 2,450 bytes | 
  Status: SUCCESS
```

If something goes wrong, you can review: "What did the AI do at 2:30 PM?" The answer is always in the audit log.

---

## Installation (The Easy Way)

### **Step 1: Get the Code**

Open your terminal and run:

```bash
# Clone the repository
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP

# Install dependencies
npm install
```

**What's happening:**
- `git clone`: Downloads the ATLAS-GATE-MCP code to your computer
- `cd`: Changes to that directory
- `npm install`: Downloads all the helper libraries ATLAS-GATE-MCP needs

### **Step 2: Verify Installation**

Run:

```bash
npm test
```

You should see something like:
```
✓ Tests passed
✓ System is ready
```

If you see errors, check [Troubleshooting](#troubleshooting) below.

### **Step 3: Start the Server**

ATLAS-GATE-MCP runs as a server. Start it with:

```bash
npm run start:windsurf
```

Or, if you want read-only mode:

```bash
npm run start:antigravity
```

You should see:
```
ATLAS-GATE-MCP server started
Listening on stdio
Ready for connections
```

**Success!** The server is running. Leave this terminal open while you use ATLAS-GATE-MCP.

---

## Your First Operation

### **Step 1: Create a Plan**

Before the AI can do work, create a plan file. Create a file called `plan-001.md`:

```markdown
# Plan: First Test

Status: APPROVED
Created: 2026-02-04
Description: Test writing a simple file using ATLAS-GATE-MCP

## Scope

Create a test file to verify system is working.

## Approval

This plan has been reviewed and approved.
```

Save this file in your project directory.

### **Step 2: Configure Your Workspace**

Create a `.env` file in your project root:

```env
# Workspace directory (where files will be read/written)
WORKSPACE_DIR=.

# Audit log location
AUDIT_LOG_FILE=./audit-log.jsonl

# Current plan for authorization
CURRENT_PLAN=plan-001
```

### **Step 3: Test with an AI Tool**

Use Claude, ChatGPT, or Windsurf. Tell it:

```
I want to use ATLAS-GATE-MCP to safely make changes.
Please read the file documentation and create a test file.

Workspace: /path/to/my/project
Plan: plan-001
Role: Windsurf (can write)
```

The AI will use ATLAS-GATE-MCP. It will:
1. Check: "Is plan-001 approved?" → Yes
2. Check: "Can Windsurf role do this?" → Yes
3. Perform the operation
4. Log everything in audit-log.jsonl

### **Step 4: Check the Audit Log**

Open `audit-log.jsonl` in your text editor. You'll see entries like:

```json
{"timestamp":"2026-02-04T14:30:45Z","operation":"file_read","file":"plan-001.md","role":"WINDSURF","status":"SUCCESS"}
{"timestamp":"2026-02-04T14:30:46Z","operation":"file_write","file":"test-output.txt","role":"WINDSURF","status":"SUCCESS","plan":"plan-001"}
```

**This is proof:** You can see exactly what happened, when, and by whom. No surprises.

---

## Common Tasks

### **Task 1: Give the AI Permission to Make Changes**

**What to do:**
1. Create a plan document (`.md` file)
2. Write what you want the AI to do
3. Save it in your project
4. Set `CURRENT_PLAN` in `.env` to the plan filename

The AI will check this plan before making changes.

### **Task 2: Review What the AI Actually Did**

**How:**
1. Open `audit-log.jsonl`
2. Search for a timestamp or filename
3. See what happened, when, and why

You can use any tool:
- Text editor: Open and search (Ctrl+F)
- Command line: `grep "filename.txt" audit-log.jsonl`
- JSON viewer: Paste into [jsoncrack.com](https://jsoncrack.com)

### **Task 3: Limit What the AI Can Do**

ATLAS-GATE-MCP supports two roles:

**For work that modifies files:**
```bash
npm run start:windsurf
```

**For analysis (no file changes allowed):**
```bash
npm run start:antigravity
```

The AI will obey whichever role is active.

### **Task 4: Investigate a Problem**

If something went wrong:

1. **Check the audit log**: `cat audit-log.jsonl | tail -20` (last 20 operations)
2. **Look for errors**: Search for `"status":"FAILED"`
3. **Read the error message**: It explains what went wrong
4. **Take action**: Fix the issue, create a new plan, try again

---

## Troubleshooting

### **Problem: "npm install" fails**

**Solution:**
- Make sure Node.js is version 18+: `node --version`
- Try deleting `node_modules` folder and try again:
  ```bash
  rm -rf node_modules
  npm install
  ```

### **Problem: "npm test" fails**

**Solution:**
- Restart your computer
- Make sure no other ATLAS-GATE-MCP instance is running
- Try: `npm run verify`

### **Problem: Server won't start**

**Solution:**
- Check port 9000 isn't already in use
- Try a different role:
  ```bash
  npm run start:antigravity
  ```
- Check logs: errors are printed to terminal

### **Problem: AI says "unauthorized" or "not approved"**

**Solution:**
- Check that your plan file exists
- Check that `.env` has correct `CURRENT_PLAN`
- Verify plan status is "APPROVED"
- Try with Antigravity first (read-only, fewer restrictions)

### **Problem: Audit log is missing**

**Solution:**
- Check `.env` has correct `AUDIT_LOG_FILE` path
- Make sure directory exists and is writable
- Try: `touch audit-log.jsonl` to create the file
- Restart the server

### **Can't Find Something?**

- **Check [Glossary](../GLOSSARY.md)** for term definitions
- **See [Troubleshooting](./TROUBLESHOOTING.md)** for detailed solutions
- **Ask in [Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP/discussions)**

---

## Next Steps

Now that you understand the basics:

### **Want to Do More?**
- **Configuration**: [CONFIGURATION.md](./CONFIGURATION.md) — All options explained
- **Usage**: [USAGE_GUIDE.md](./USAGE_GUIDE.md) — Daily operations
- **Examples**: [EXAMPLES.md](./EXAMPLES.md) — Real-world scenarios

### **Ready to Contribute?**
- [Development Setup](../contributor-guide/DEVELOPMENT_SETUP.md)
- [Contributing Guide](../contributor-guide/CONTRIBUTING.md)

### **Going to Production?**
- [Deployment Guide](../enterprise-guide/DEPLOYMENT.md)
- [Compliance Guide](../enterprise-guide/COMPLIANCE.md)

### **Something Unclear?**
- **Glossary**: [GLOSSARY.md](../GLOSSARY.md)
- **FAQ**: [FAQ.md](./FAQ.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Summary

You now know:

1. **What it is**: Security control for AI assistants
2. **How to install it**: `npm install` + `npm run start:windsurf`
3. **How to use it**: Create plans, AI follows them, audit log records everything
4. **How to verify it worked**: Check audit-log.jsonl

**You're ready to use ATLAS-GATE-MCP safely and confidently.**

---

**Version**: 2.0.0  
**Difficulty**: Beginner (No prior experience required)  
**Time to Complete**: 30 minutes  
**Next**: [Configuration Guide](./CONFIGURATION.md)
