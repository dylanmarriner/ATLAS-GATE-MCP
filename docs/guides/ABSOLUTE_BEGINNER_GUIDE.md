---
title: "KAIZA MCP: Absolute Beginner's Guide"
description: "Learn to use KAIZA MCP assuming zero computer experience"
version: "1.0.0"
last_updated: "2026-01-20"
audience: ["beginner", "non-technical", "learner"]
---

# KAIZA MCP: Absolute Beginner's Guide

**Read this if:** You've never used a command line, you don't know what Git is, or you're just getting started with software development.

**What you'll learn:** How to install, configure, and run KAIZA MCP—no computer science degree required.

---

## Table of Contents

1. [What Is This?](#what-is-this) (Plain English)
2. [What You'll Need](#what-youll-need)
3. [Learning Paths](#learning-paths)
4. [Installation (Step-by-Step)](#installation-step-by-step)
5. [Your First Plan](#your-first-plan)
6. [Troubleshooting](#troubleshooting)
7. [Glossary for Humans](#glossary-for-humans)
8. [Safety & Data Handling](#safety--data-handling)

---

## What Is This? (Plain English)

### The Simple Explanation

Imagine you have a very smart assistant (an AI agent like Claude) who can write code and modify your project files. KAIZA MCP is like a **permission slip system** for that assistant.

**Without KAIZA MCP:**
- The assistant can change any file it wants
- You have no record of what changed or why
- If something breaks, you don't know what happened

**With KAIZA MCP:**
- The assistant must ask for permission (create a "plan") before making changes
- You approve or reject the plan
- Every change is recorded in a tamper-proof logbook
- If something breaks, you can rewind and see exactly what happened

### What You Can Do With It

1. **Create a Plan:** Describe what changes you want the AI to make (e.g., "Add a login form to the homepage")
2. **The AI Executes:** Once approved, the AI makes only the changes you approved—nothing more
3. **Everything Is Logged:** Every change is recorded with a timestamp, who approved it, and what changed
4. **Audit & Replay:** You can review the history and verify nothing suspicious happened

---

## What You'll Need

### 1. A Computer

Any of these will work:
- **Windows** (Windows 10 or newer)
- **macOS** (Macs from 2015 or newer)
- **Linux** (Ubuntu, Fedora, Debian, etc.)

### 2. Internet Connection

You need to download software. A stable WiFi or wired connection is best.

### 3. A Text Editor

You need to edit configuration files. Options:
- **Windows**: Notepad (built-in) or [VS Code (free)](https://code.visualstudio.com/)
- **macOS**: TextEdit (built-in) or [VS Code (free)](https://code.visualstudio.com/)
- **Linux**: nano, gedit, or [VS Code (free)](https://code.visualstudio.com/)

**Recommendation:** Download VS Code (it's free and helps prevent mistakes).

### 4. Your MCP Client

KAIZA MCP works with tools like:
- [Claude Desktop](https://claude.ai/desktop) (Most common)
- [Windsurf IDE](https://www.codeium.com/windsurf) (Code editor + AI)
- [Antigravity](https://antigrav.ai/) (AI coding assistant)

**You'll need at least one of these.** We'll use **Claude Desktop** in examples below, but the principles are the same.

---

## Learning Paths

### Fast Path (15 minutes)

**Goal:** Get it running and understand the basic workflow.

1. ✅ Install Node.js ([Fast Path Instructions](#fast-path-install))
2. ✅ Download KAIZA MCP
3. ✅ Configure your MCP client (add KAIZA)
4. ✅ Run one test plan
5. ✅ Done!

### Step-by-Step with Explanations (45 minutes)

**Goal:** Understand everything as you go.

1. ✅ [Learn about your command line](#understanding-your-command-line)
2. ✅ [Install Node.js](#installation-step-by-step)
3. ✅ [Download KAIZA MCP](#download-kaiza-mcp)
4. ✅ [Configure your client](#configure-your-mcp-client)
5. ✅ [Create your first plan](#your-first-plan)
6. ✅ [Review what you created](#reviewing-your-changes)

### Troubleshooting as You Go

**Goal:** Have answers ready if something breaks.

Throughout this guide, you'll see:
- ⚠️ **"If this happens, do this"** boxes
- 🔧 **"How to fix it"** sections
- 📞 **"When to get help"** guidance

Jump to [Troubleshooting](#troubleshooting) anytime you get stuck.

---

## Installation (Step-by-Step)

### What is "Installation"?

Installation means: downloading software and setting it up so it works on your computer.

Think of it like buying a lamp:
1. You buy the lamp (download)
2. You unpack it (extract)
3. You plug it in and turn it on (configure & run)
4. Now it works (installed)

### Fast Path Install

**Prerequisites:** Internet connection, 15 minutes, basic keyboard skills

#### Step 1: Install Node.js

**What is Node.js?** A program that lets JavaScript (a programming language) run on your computer.

**Choose your system:**

<details>
<summary><b>Windows</b></summary>

1. Open your web browser (Chrome, Safari, Edge, Firefox)
2. Go to https://nodejs.org
3. Look for the large green button labeled **"Download for Windows"**
4. Click it (this downloads a file to your computer, usually to "Downloads")
5. Open your **File Explorer** (the folder icon on your taskbar)
6. Find the file that looks like `node-vXX.XX.X-x64.msi` in your Downloads folder
7. Double-click it
8. Follow the prompts:
   - Click "Next" multiple times
   - Accept the license agreement (click "I agree")
   - Click "Install"
   - Click "Finish"
9. **Verify:** Open **Command Prompt** (press Windows key + R, type `cmd`, press Enter)
   - Type: `node --version`
   - You should see: `vXX.XX.X` (a version number)

</details>

<details>
<summary><b>macOS</b></summary>

1. Open your web browser (Safari, Chrome, Firefox)
2. Go to https://nodejs.org
3. Look for the large green button labeled **"Download for macOS"**
4. Click it (this downloads a file, usually to your Downloads folder)
5. Open **Finder** (click the Finder icon in your dock)
6. Click "Downloads" in the left sidebar
7. Find the file that looks like `node-vXX.XX.X.pkg`
8. Double-click it
9. Follow the prompts:
   - Click "Continue"
   - Accept the license (click "Agree")
   - Click "Install"
   - Enter your Mac password (if prompted)
   - Click "Install Software"
   - Click "Close"
10. **Verify:** Open **Terminal** (press Command ⌘ + Space, type `terminal`, press Enter)
    - Type: `node --version`
    - You should see: `vXX.XX.X` (a version number)

</details>

<details>
<summary><b>Linux (Ubuntu/Debian)</b></summary>

1. Open a **Terminal** (usually Ctrl + Alt + T)
2. Copy and paste this command:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs
   ```
3. Press Enter
4. Enter your password (if prompted)
5. Wait for it to finish
6. **Verify:** Type `node --version` and press Enter
   - You should see: `vXX.XX.X` (a version number)

</details>

#### Step 2: Download KAIZA MCP

**What is Git?** A tool that downloads and manages code. It's like Dropbox for programmers.

<details>
<summary><b>Option A: Using Git (Recommended for developers)</b></summary>

1. **Install Git:**
   - **Windows:** Download from https://git-scm.com/ and follow prompts
   - **macOS:** Download from https://git-scm.com/ (or run: `xcode-select --install`)
   - **Linux:** Run: `sudo apt-get install -y git`

2. Open your command line:
   - **Windows:** Press Windows key + R, type `cmd`, press Enter
   - **macOS:** Press Command ⌘ + Space, type `terminal`, press Enter
   - **Linux:** Press Ctrl + Alt + T

3. Copy and paste this command:
   ```bash
   git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git
   cd KAIZA-MCP-server
   ```

4. Press Enter. **Success** looks like:
   ```
   Cloning into 'KAIZA-MCP-server'...
   remote: Enumerating objects: ... done
   ...
   ```

</details>

<details>
<summary><b>Option B: Download as ZIP (No Git required)</b></summary>

1. Open your web browser
2. Go to https://github.com/dylanmarriner/KAIZA-MCP-server
3. Click the green **"Code"** button (top right)
4. Click **"Download ZIP"**
5. Your browser downloads a file to your Downloads folder
6. **Extract the ZIP:**
   - **Windows:** Right-click the file, select "Extract All", choose where to put it
   - **macOS:** Double-click the ZIP file (it auto-extracts)
   - **Linux:** Right-click, select "Extract Here" (or use `unzip` command)
7. Open your command line and navigate to the extracted folder:
   ```bash
   cd KAIZA-MCP-server
   ```

</details>

#### Step 3: Install Dependencies

**What are "dependencies"?** Other software that KAIZA MCP needs to run.

1. In your command line (still in the KAIZA-MCP-server folder), type:
   ```bash
   npm install
   ```

2. Press Enter

3. **Success** looks like:
   ```
   added 187 packages in 23s
   ```

   **If it fails:** See [Troubleshooting](#troubleshooting).

#### Step 4: Verify Installation

1. Type:
   ```bash
   npm run verify
   ```

2. Press Enter

3. **Success** looks like:
   ```
   [GOVERNANCE] Self-Audit Passed.
   ✅ All checks passed!
   ```

   **Congratulations! KAIZA MCP is installed.**

---

## Understanding Your Command Line

### What Is a Command Line?

The **command line** (also called **terminal**, **console**, or **shell**) is a text-based way to tell your computer what to do.

Instead of clicking buttons, you type commands.

### Your First Commands

**Change Directory (Move to a Folder)**

```bash
cd KAIZA-MCP-server
```

- **What it does:** Opens the KAIZA-MCP-server folder
- **Success looks like:** Your prompt changes to show you're inside the folder
- **Example prompt:** `user@computer KAIZA-MCP-server % `

**List Files**

```bash
ls
```

(On Windows, use `dir` instead)

- **What it does:** Shows all files and folders in your current location
- **Success looks like:** You see a list of files (README.md, package.json, etc.)

**See Your Current Location**

```bash
pwd
```

- **What it does:** Shows the full path (address) of where you are
- **Success looks like:** `/Users/yourname/KAIZA-MCP-server` (on macOS) or `C:\Users\yourname\KAIZA-MCP-server` (on Windows)

### Copy/Paste in Terminal

**MacOS/Linux:**
- Copy: `Cmd ⌘ + C` (or `Ctrl + C`)
- Paste: `Cmd ⌘ + V` (or `Ctrl + V`)

**Windows (Command Prompt):**
- Right-click to paste
- `Ctrl + C` to copy

---

## Configure Your MCP Client

### What Is an MCP Client?

Your **MCP client** is the software that talks to KAIZA MCP. Examples:
- Claude Desktop
- Windsurf
- Antigravity

We'll use **Claude Desktop** as our example.

### Step 1: Locate KAIZA-MCP-server Path

You need the **full path** to your KAIZA-MCP-server folder.

In your command line, type:
```bash
pwd
```

Press Enter. You'll see something like:
- **macOS:** `/Users/yourname/KAIZA-MCP-server`
- **Windows:** `C:\Users\yourname\KAIZA-MCP-server`
- **Linux:** `/home/yourname/KAIZA-MCP-server`

**Copy this path.** You'll need it in the next step.

### Step 2: Edit Configuration File

**For Claude Desktop (macOS):**

1. Open Finder
2. Press Command ⌘ + Shift + G (Go to folder)
3. Paste this path: `~/.claude/mcp_config.json`
4. Press Enter
5. Right-click the file, select "Open With", choose a text editor (VS Code or TextEdit)
6. You should see a file like:
   ```json
   {
     "mcpServers": {}
   }
   ```
7. Edit it to add KAIZA:
   ```json
   {
     "mcpServers": {
       "kaiza": {
         "command": "node",
         "args": ["/absolute/path/to/KAIZA-MCP-server/bin/kaiza-mcp-windsurf.js"],
         "type": "stdio",
         "disabled": false
       }
     }
   }
   ```
8. **Replace** `/absolute/path/to/KAIZA-MCP-server` with the path you copied in Step 1
9. Save the file (Command ⌘ + S)
10. Restart Claude Desktop

**For Claude Desktop (Windows):**

1. Open File Explorer
2. Paste this path in the address bar: `%APPDATA%\.claude`
3. Press Enter
4. Find and open `mcp_config.json` (right-click, "Open With", choose a text editor)
5. Follow steps 6–10 above

**For Windsurf:**

1. Open File Explorer / Finder
2. Locate `~/.codeium/windsurf/mcp_config.json`
3. Edit the same way as above, but use this path:
   ```json
   "args": ["/absolute/path/to/KAIZA-MCP-server/bin/kaiza-mcp-windsurf.js"]
   ```

---

## Your First Plan

### What Is a "Plan"?

A **plan** is your written instruction to the AI: "Here's what I want you to change in my project."

For example:
- "Add a README.md file with project overview"
- "Change the color of the button from blue to red"
- "Update the version number from 1.0.0 to 1.0.1"

### Create Your First Plan

**Step 1: Open Claude Desktop (or your MCP client)**

**Step 2: Start a conversation with the beginning_session command**

In Claude, type:
```
Call the begin_session tool with workspace_root set to: /absolute/path/to/KAIZA-MCP-server
```

(Replace `/absolute/path/to/KAIZA-MCP-server` with the actual path from earlier.)

**Claude will respond:**
```
Session initialized. Workspace locked to /absolute/path/to/KAIZA-MCP-server
```

✅ **Success:** You've initialized a session. This tells KAIZA which project you're working on.

**Step 3: Create a Simple Plan**

Ask Claude:
```
Create a plan that adds a file called TEST.md to the docs/ folder with content:
---
This is a test file created with KAIZA MCP.
---
```

Claude will:
1. Create a plan file
2. Hash it
3. Return the plan hash

📝 **Example response:**
```
Plan created:
Hash: a1b2c3d4e5f6...
File: docs/plans/test-plan.json
Status: Ready for execution
```

**Step 4: Execute the Plan**

Ask Claude:
```
Execute the plan with hash: a1b2c3d4e5f6...
Role: WINDSURF
```

Claude will:
1. Execute the plan
2. Create the TEST.md file
3. Log everything in the audit trail

📝 **Example response:**
```
✅ Plan executed successfully
Files created: docs/TEST.md
Audit entry: [seq_123] user=windsurf, tool=write_file
```

### Verify Your Change

**Step 5: Check What Was Created**

1. Open File Explorer / Finder
2. Navigate to your KAIZA-MCP-server folder
3. Open the `docs/` folder
4. You should see **TEST.md** with your content

📸 **Screenshot placeholder:** [Finder window showing TEST.md in docs/]

✅ **Congratulations!** You've created your first plan and executed it.

---

## Reviewing Your Changes

### View the Audit Log

The **audit log** is a record of everything that happened.

In Claude, ask:
```
Show me the audit log
```

You'll see:
```json
{
  "session_id": "...",
  "tool": "write_file",
  "file": "docs/TEST.md",
  "timestamp": "2026-01-20T15:30:00Z",
  "status": "success"
}
```

### Understand the Audit Log

| Field | Meaning |
|-------|---------|
| `session_id` | Unique ID for this work session |
| `tool` | What action was performed (write_file, read_file, etc.) |
| `file` | Which file was affected |
| `timestamp` | When it happened (date and time) |
| `status` | Did it work? (success/error) |

---

## Troubleshooting

### Problem: "node: command not found"

**Cause:** Node.js isn't installed or not in your PATH.

**Fix:**
1. Reinstall Node.js from https://nodejs.org (follow Fast Path above)
2. Restart your command line / terminal
3. Type `node --version` to verify

### Problem: "npm: command not found"

**Cause:** npm (comes with Node.js) isn't installed.

**Fix:** Reinstall Node.js.

### Problem: "Module not found" or dependency errors

**Cause:** `npm install` didn't complete successfully.

**Fix:**
1. Delete the `node_modules/` folder:
   ```bash
   rm -rf node_modules
   ```
   (Windows: delete the folder manually via File Explorer)
2. Reinstall:
   ```bash
   npm install
   ```
3. Wait for it to complete (2–5 minutes)

### Problem: "Permission denied" error

**Cause:** You don't have permission to write to this folder.

**Fix:**
1. **macOS/Linux:** Add `sudo` (admin) permission:
   ```bash
   sudo npm install
   ```
2. **Windows:** Run Command Prompt as Administrator (right-click Command Prompt, "Run as administrator")

### Problem: npm install is very slow

**Cause:** Network issue or many dependencies.

**Fix:**
- Check your internet connection
- Try again (sometimes this helps)
- If still slow, contact your IT support if on a corporate network

### Problem: Claude doesn't recognize the begin_session command

**Cause:** Configuration not saved or Claude needs restart.

**Fix:**
1. Make sure your `mcp_config.json` file is saved
2. Completely quit Claude Desktop (Command ⌘ + Q on Mac, Alt + F4 on Windows)
3. Wait 10 seconds
4. Reopen Claude Desktop
5. Try again

### Problem: "REFUSE: Session not initialized"

**Cause:** You forgot to call `begin_session` first.

**Fix:** In Claude, call:
```
begin_session with workspace_root: /path/to/KAIZA-MCP-server
```

### Problem: My audit log shows an error

**Cause:** Something went wrong during execution.

**Example error:**
```
[error] write_file failed: EACCES: permission denied
```

**Fix:**
1. Check file permissions (do you own the file?)
2. Make sure the path is correct
3. Verify you're in the right session (run `begin_session` again)

---

## Glossary for Humans

**Plain English definitions of every technical term you'll encounter.**

### A

**API** (Application Programming Interface)
A set of rules that lets different software programs talk to each other. Think of it as a "phone number" to call a service.

**Audit Log**
A permanent record of everything that happened. Like a security camera for your code.

**Authorization**
Permission. "Do I have permission to do this action?"

### B

**Binary**
The most basic language computers understand: 1s and 0s.

**Bootstrap**
To start something from scratch. In KAIZA, "bootstrapping a plan" means creating the first plan.

### C

**CLI / Command Line Interface**
Text-based way to give commands to your computer (instead of clicking buttons).

**Cryptographic**
Using advanced math to lock and verify data. Think: unbreakable encryption.

**Cursor**
The blinking line in your terminal showing where you are.

### D

**Deprecate / Deprecated**
Mark something as outdated. "We're deprecating this feature—stop using it, something better is coming."

**Directory**
A folder. Contains files or other folders.

**Dependency**
Software that another program needs to run. Like "this app depends on Node.js."

### E

**Epoch**
A specific moment in time (usually January 1, 1970, in computer context). Used for timestamps.

**Error**
Something went wrong. The program is telling you what broke.

**Execute**
Run a command or program. "Execute the plan" = "Run the plan."

### G

**Git**
Version control system. Tracks changes to code over time. Like "Track Changes" in Microsoft Word, but for code.

**GitHub**
Website where code is stored and shared. Git + Hub = GitHub.

**Governance**
Rules and controls. "Who can do what, and how do we prove it happened?"

### H

**Hash / Hash Function**
A math function that turns data into a unique fingerprint. Same data = same hash. Changed data = different hash.

**Hex / Hexadecimal**
Numbering system using 0–9 and A–F. Computer-friendly way to write long numbers.

### I

**Initialize**
Set up or start. "Initialize a session" = "Start a work session."

**Integrity**
Data hasn't been tampered with. "Verify integrity" = "Make sure nothing changed."

### J

**JSON** (JavaScript Object Notation)
Human-readable format for storing data. Looks like:
```json
{
  "name": "John",
  "age": 30
}
```

### L

**LTS** (Long-Term Support)
Version supported for a long time (usually 2+ years) with bug fixes.

### M

**MCP** (Model Context Protocol)
Standard way for AI assistants (like Claude) to interact with tools and systems.

**Module**
A piece of code that does one job. Like a module in a building.

### N

**Node.js**
Runtime that lets JavaScript run on computers (outside web browsers).

**npm**
Node Package Manager. Tool to download and manage code libraries.

### O

**OAuth**
Secure way to give an app permission to access your account (without giving password).

**Ownership**
Someone is responsible for maintaining something.

### P

**Package**
A bundle of code ready to install. Like a package from Amazon.

**Path**
Address of a file or folder. Example: `/Users/yourname/Documents/KAIZA-MCP-server/`

**Permission**
Can you do this action? Read, write, execute?

**Plan**
In KAIZA MCP, a detailed instruction for what changes should happen.

**Prompt**
Text you send to Claude (or another AI) asking it to do something.

### R

**RBAC** (Role-Based Access Control)
System where people have roles (e.g., "Admin", "User") and roles have permissions.

**Repo / Repository**
A folder containing a project (usually code). Often on GitHub.

**Role**
A job title with specific permissions. Examples: Admin, User, Editor.

### S

**Schema**
Structure or blueprint. "This data follows this schema" = "The data is shaped like I expect."

**Session**
A work period. When you start working until you stop.

**SHA / SHA256**
Specific type of hash function (very secure). Standard in cryptography.

**Shell**
Command-line interface. The program you type commands into.

**Signature / Signed**
Cryptographic proof that something is authentic. "This document is signed" = "I promise this is real."

### T

**Terminal**
Same as Command Line Interface. Where you type commands.

**Timestamp**
Date and time something happened.

**Trustless / Zero-Trust**
Don't trust anything automatically. Verify everything.

### V

**Validate**
Check that something is correct.

**Versioning**
Tracking different versions. Version 1.0, 1.1, 2.0, etc.

### W

**Windsurf**
An MCP client (tool that uses KAIZA MCP). Like an IDE with AI built-in.

**Workspace**
Your project folder. Everything for one project lives here.

### Z

**Zero-Trust Architecture**
Security philosophy: assume nothing is trustworthy. Verify everything.

---

## Safety & Data Handling

### Protecting Your Secrets

**Secrets** are passwords, API keys, tokens—things you should never share.

#### 🚨 Never Do This

```
DON'T put this in a file:
API_KEY=sk-1234567890abcdefg
SECRET_TOKEN=abc123xyz789
DATABASE_PASSWORD=MyP@ssw0rd!
```

#### ✅ Do This Instead

**Use environment variables:**

1. Create a file called `.env` (in your KAIZA-MCP-server folder)
2. Put secrets there:
   ```
   API_KEY=sk-1234567890abcdefg
   SECRET_TOKEN=abc123xyz789
   DATABASE_PASSWORD=MyP@ssw0rd!
   ```
3. Add `.env` to `.gitignore` (so it never gets uploaded)
4. In your code, read from environment:
   ```javascript
   const apiKey = process.env.API_KEY;
   ```

#### 📋 Checklist: Safe Secret Handling

- [ ] Never commit secrets to Git
- [ ] Use `.env` files for local development
- [ ] Use `.gitignore` to prevent uploading secrets
- [ ] For production, use secret management (AWS Secrets Manager, HashiCorp Vault)
- [ ] If you accidentally commit a secret, rotate it immediately (generate a new one)
- [ ] Don't paste secrets into chat or prompts

### Data Privacy

**KAIZA MCP stores:**
- Audit logs (file changes, who made them, when)
- Plan files (descriptions of intended changes)
- Workspace configuration

**KAIZA MCP does NOT:**
- Send your code anywhere
- Share your secrets
- Upload to external services (unless you configure it)
- Track usage (by default)

#### Safe Practices

1. **Review plans before execution:** Always read what the AI is planning to do
2. **Check audit logs regularly:** Look for unexpected changes
3. **Use git to track everything:** Commit to git after verified changes
4. **Back up regularly:** Don't rely on KAIZA as your only backup

### File Permissions

**File permissions** control who can read/write/execute files.

**Safe defaults:**
- Your own files: `644` (you read/write, others read only)
- Executables: `755` (you can do anything, others can run)
- Secrets: `600` (only you can read/write)

To check file permissions:

```bash
ls -la
```

You'll see something like:
```
-rw-r--r--  1 user  group   1234  Jan 20 10:30 README.md
```

- First 3 chars (`rw-`): You can read and write
- Next 3 chars (`r--`): Group can read only
- Last 3 chars (`r--`): Others can read only

---

## Next Steps

### Congratulations! 🎉

You've learned:
✅ What KAIZA MCP is  
✅ How to install it  
✅ How to create your first plan  
✅ How to execute it  
✅ How to verify what happened  
✅ How to troubleshoot  

### What's Next?

1. **Try more complex plans:** Ask Claude to make realistic changes (add features, fix bugs)
2. **Review audit logs:** Get comfortable reading the history
3. **Read advanced guides:** Check out [SETUP_GUIDE.md](./SETUP_GUIDE.md) for deeper learning
4. **Explore architecture:** Understand how KAIZA works under the hood ([ARCHITECTURE.md](../ARCHITECTURE.md))
5. **Join the community:** Ask questions in [GitHub Discussions](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions)

### Still Confused?

- 📖 **Documentation:** Full docs at [docs/README.md](../README.md)
- 💬 **Discussions:** Ask in [GitHub Discussions](https://github.com/dylanmarriner/KAIZA-MCP-server/discussions)
- 🐛 **Bug Report:** Report issues in [GitHub Issues](https://github.com/dylanmarriner/KAIZA-MCP-server/issues)
- 🔒 **Security Question:** See [SECURITY.md](../../SECURITY.md)

---

**Document Owner:** KAIZA MCP Documentation Team  
**Last Updated:** 2026-01-20  
**Version:** 1.0.0

Happy coding! 🚀
