# Absolute Beginner's Guide: Using ATLAS-GATE MCP from Zero

**For people who have never used a computer before.**

## Table of Contents
1. [What This Is](#what-this-is)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Fast Path (5 minutes)](#fast-path-5-minutes)
4. [Step-by-Step with Explanations](#step-by-step-with-explanations)
5. [Glossary for Humans](#glossary-for-humans)
6. [Troubleshooting](#troubleshooting)

---

## What This Is

**ATLAS-GATE MCP** is a tool that lets you safely use AI (artificial intelligence) to help with software development. Think of it like having a very intelligent assistant who:
- Suggests changes to your code
- Keeps a detailed record of everything that happens
- Only makes changes you've approved
- Never makes mistakes that could destroy your work

**You don't need to be a programmer to use this guide.** We explain everything step-by-step.

---

## Prerequisites & Setup

### What You'll Need

1. **A Computer** (Windows, Mac, or Linux)
2. **A Text Editor** (built-in to your computer, or free download)
3. **Git** (a tool for managing code files) — we'll show you how to install it
4. **Node.js** (software that runs JavaScript code) — we'll show you how to install it
5. **An Internet Connection**

### Installation Path: Choose Your Computer Type

#### **Windows Computer**

**Step 1: Install Git**
1. Go to https://git-scm.com/download/win
2. Click the large blue "Download" button
3. Open the file that downloads (usually in your "Downloads" folder)
4. Click "Yes" if it asks for permission
5. Click "Next" through all screens, accepting defaults
6. Click "Install" at the end
7. Click "Finish"

**Step 2: Install Node.js**
1. Go to https://nodejs.org
2. Click the large button that says "LTS" (Long Term Support)
3. Open the file that downloads
4. Click "Yes" if it asks for permission
5. Click "Next" through all screens, accepting defaults
6. **Important**: On the "Tools for Native Modules" screen, leave it UNCHECKED and click Next
7. Click "Install" at the end
8. Click "Finish"

**Verify Installation (Windows)**
1. Right-click on your desktop
2. Click "Open Terminal here" or "Open PowerShell window here"
3. Type: `node --version` and press Enter
4. You should see a version number like `v18.0.0`
5. Type: `git --version` and press Enter
6. You should see a version number

---

#### **Mac Computer**

**Step 1: Install Homebrew** (package manager)
1. Open **Applications** → **Utilities** → **Terminal** (or press Cmd+Space, type "Terminal")
2. Copy and paste this (all one line):
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
3. Press Enter
4. Type your computer password when asked, then press Enter
5. Wait 5-10 minutes for installation to complete

**Step 2: Install Git and Node.js**
1. In Terminal, copy and paste:
```
brew install git node
```
2. Press Enter
3. Wait for installation to complete

**Verify Installation (Mac)**
1. In Terminal, type: `node --version` and press Enter
2. You should see a version number like `v18.0.0`
3. Type: `git --version` and press Enter
4. You should see a version number

---

#### **Linux Computer**

**For Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y git nodejs npm
```

**For Fedora/CentOS:**
```bash
sudo dnf install -y git nodejs npm
```

**Verify Installation:**
```bash
node --version
git --version
```

---

### Download ATLAS-GATE MCP

#### **Option A: Using Git (Recommended)**

1. **Open Terminal/Command Prompt**
   - **Windows**: Right-click desktop → "Open Terminal here"
   - **Mac**: Applications → Utilities → Terminal
   - **Linux**: Ctrl+Alt+T or open your terminal app

2. **Copy and paste this command:**
```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP-server.git
```
3. Press Enter
4. Wait for it to finish (you'll see text scrolling)

#### **Option B: Download as ZIP File (If you prefer not to use Git)**

1. Go to https://github.com/dylanmarriner/ATLAS-GATE-MCP-server
2. Click the green "Code" button
3. Click "Download ZIP"
4. Open your "Downloads" folder
5. Right-click "ATLAS-GATE-MCP-server-main.zip"
6. Click "Extract All" (Windows) or "Unzip" (Mac)
7. A new folder appears

---

### Navigate to the Folder

**Windows (PowerShell/Command Prompt):**
```
cd ATLAS-GATE-MCP-server
```
or
```
cd ATLAS-GATE-MCP-server-main
```

**Mac/Linux (Terminal):**
```bash
cd ATLAS-GATE-MCP-server
```
or
```bash
cd ATLAS-GATE-MCP-server-main
```

**What `cd` means:** "Change Directory" — it means "go into this folder."

---

### Install Dependencies

Once you're inside the ATLAS-GATE-MCP-server folder:

**All Platforms:**
```bash
npm install
```

**What this does:** Downloads all the code libraries ATLAS-GATE MCP needs to run. This takes 2-5 minutes.

**What success looks like:**
- No red error messages at the end
- The command prompt returns (ready for new commands)

**If it fails:**
- Make sure Node.js is installed correctly (run `node --version` again)
- Make sure you're in the right folder (run `ls` or `dir` and look for a "package.json" file)

---

### Set Up Bootstrap Secret

ATLAS-GATE MCP requires a "bootstrap secret" — think of it like a password that authenticates the first time you use it.

**Option 1: Automatic Setup (Easiest)**

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-bootstrap.ps1
```

**Mac/Linux:**
```bash
bash scripts/setup-bootstrap.sh
```

**What success looks like:**
- A message saying "Bootstrap secret set successfully" or similar
- An environment variable is created

**Option 2: Manual Setup**

If the automatic script doesn't work:

**Windows (PowerShell):**
```powershell
$env:ATLAS-GATE_BOOTSTRAP_SECRET = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
echo $env:ATLAS-GATE_BOOTSTRAP_SECRET
```

**Mac/Linux:**
```bash
export ATLAS-GATE_BOOTSTRAP_SECRET=$(openssl rand -base64 32)
echo $ATLAS-GATE_BOOTSTRAP_SECRET
```

**What to do with the result:**
- You'll see a long random string
- **Copy it and save it somewhere safe** (a text file in your "Documents" folder)
- You'll need this to start the server

---

## Fast Path (5 minutes)

### Minimal Example

Once everything is installed and in the right folder:

**Windows:**
```powershell
$env:ATLAS-GATE_BOOTSTRAP_SECRET = "your-bootstrap-secret-here"
npm run verify
```

**Mac/Linux:**
```bash
export ATLAS-GATE_BOOTSTRAP_SECRET="your-bootstrap-secret-here"
npm run verify
```

Replace `your-bootstrap-secret-here` with the secret you saved earlier.

**What success looks like:**
- Green checkmarks or "passed" messages
- No red error text

**What happens next:**
- ATLAS-GATE MCP is now ready to use with your AI client (Claude Desktop, Windsurf, etc.)
- See the "For Developers" section in the main README for how to configure it

---

## Step-by-Step with Explanations

### Part 1: Setting Up Your Computer

#### What is a "Terminal" or "Command Prompt"?

A Terminal (Mac/Linux) or Command Prompt/PowerShell (Windows) is a text-based way to talk to your computer. Instead of clicking buttons, you type instructions.

**Why use it?** Some tools (like Git and ATLAS-GATE MCP) only work through the Terminal.

#### How to Open Terminal/Command Prompt

**Windows 11:**
1. Right-click on your desktop
2. Click "Open Terminal here"

**Windows 10:**
1. Press `Win + R`
2. Type `cmd` and press Enter

**Mac:**
1. Press `Cmd + Space` (spotlight search)
2. Type `Terminal` and press Enter
3. Double-click "Terminal"

**Linux:**
1. Usually `Ctrl + Alt + T`
2. Or look in Applications menu for "Terminal"

#### Basic Terminal Commands

**Listing files** (see what's in a folder):
```bash
# On Windows (Command Prompt):
dir

# On Mac/Linux:
ls
```

**Changing folders** (going into a folder):
```bash
cd folder-name
```

**Going back one folder** (going "up"):
```bash
cd ..
```

**Seeing where you are** (your current location):
```bash
# Windows:
cd

# Mac/Linux:
pwd
```

---

### Part 2: Understanding the Folder Structure

After you've installed ATLAS-GATE MCP, here's what the main folders mean:

```
ATLAS-GATE-MCP-server/
├── docs/               ← All documentation (guides, references)
├── src/                ← Source code (don't edit unless contributing)
├── tools/              ← Tools that ATLAS-GATE MCP uses
├── tests/              ← Tests (automatic checks that everything works)
├── adr/                ← Architecture Decision Records (why things are designed a certain way)
├── scripts/            ← Helper scripts (like setup-bootstrap.sh)
├── package.json        ← List of all libraries/dependencies
└── README.md           ← Main overview (start here)
```

**You will mainly interact with:**
- `docs/` — To read documentation
- Your AI client (Claude Desktop, Windsurf) — To use ATLAS-GATE MCP
- Terminal — To run commands

---

### Part 3: Understanding Configuration

#### What is "Configuration"?

Configuration is a set of instructions that tells ATLAS-GATE MCP how to behave. It's like a recipe for how to run the software.

#### For Windsurf Users

You need to tell Windsurf where ATLAS-GATE MCP is located.

**Steps:**
1. Open a text editor (Notepad on Windows, TextEdit on Mac, etc.)
2. Create a file called `mcp_config.json`
3. Paste this (replacing the path with your actual path):

```json
{
  "mcpServers": {
    "atlas-gate-windsurf": {
      "command": "node",
      "args": ["/Users/yourname/ATLAS-GATE-MCP-server/bin/atlas-gate-mcp-windsurf.js"],
      "type": "stdio",
      "disabled": false
    }
  }
}
```

**Where to save this file:**
- **Windows**: `C:\Users\YourUsername\.codeium\windsurf\mcp_config.json`
- **Mac**: `/Users/YourUsername/.codeium/windsurf/mcp_config.json`
- **Linux**: `/home/username/.codeium/windsurf/mcp_config.json`

**Tip:** The `.codeium` folder might be hidden. You may need to show hidden files:
- **Windows**: In File Explorer, View menu → Hidden items
- **Mac**: Cmd + Shift + . (period)
- **Linux**: In file manager, Ctrl + H

---

### Part 4: Running ATLAS-GATE MCP

#### Step 1: Start Your Terminal
Open Terminal/Command Prompt (see instructions above)

#### Step 2: Navigate to the Folder
```bash
cd ATLAS-GATE-MCP-server
```

#### Step 3: Set the Bootstrap Secret
Do this **every time** you open a new Terminal window:

**Windows:**
```powershell
$env:ATLAS-GATE_BOOTSTRAP_SECRET = "your-secret-here"
```

**Mac/Linux:**
```bash
export ATLAS-GATE_BOOTSTRAP_SECRET="your-secret-here"
```

#### Step 4: Run the Verification
```bash
npm run verify
```

**What you should see:**
```
[GOVERNANCE] Starting Self-Audit...
[GOVERNANCE] Self-Audit Passed.
...
All tests passed ✓
```

---

### Part 5: Understanding Safety

#### What are "Secrets"?

Secrets (like the bootstrap secret) are passwords or codes that you must keep private. If someone else gets your secret, they could use ATLAS-GATE MCP with your authority.

**Rules for secrets:**
1. Never share your secret with anyone
2. Never paste your secret in a chat or email
3. Never commit your secret to Git
4. Store it in a safe place (password manager, encrypted file, etc.)

#### Environment Variables

An "environment variable" is a way to store information that your Terminal remembers for that session.

When you run:
```bash
export ATLAS-GATE_BOOTSTRAP_SECRET="my-secret"
```

You're telling the Terminal: "Remember this secret for the next commands I run."

**Important:** When you close the Terminal, it forgets the secret. You have to set it again next time.

#### Safe Configuration Practices

**Good practices:**
- Store secrets in a `.env` file (kept local, never in Git)
- Use environment variables (like we just did)
- Rotate (change) secrets regularly
- Use a password manager

**Bad practices:**
- Hardcoding secrets in source code
- Sharing secrets in messages or email
- Using the same secret everywhere
- Leaving secrets in Terminal history

---

## Glossary for Humans

**Audit Log** — A record of everything that happened, like a detailed diary. ATLAS-GATE MCP records every action.

**Bootstrap Secret** — The password for the first time you use ATLAS-GATE MCP. It's called "bootstrap" because it starts the system.

**CLI** — Command-Line Interface. A way to use software by typing commands (instead of clicking buttons).

**Commit** — In Git, a "commit" is saving changes with a description. It's like "I'm saving version 5 of this file."

**Configuration** — Settings that tell software how to behave.

**Directory** — A folder. Directories can contain files and other directories.

**Environment Variable** — Information that the Terminal remembers and can use. Like a sticky note on your computer.

**Export** (in Terminal) — Telling the Terminal to remember something (like an environment variable).

**File** — A document or piece of data stored on your computer.

**Folder** — A container for files and other folders. Same as "directory."

**Git** — A system for tracking changes to code. It's like "track changes" in Word, but for programmers.

**GitHub** — A website where people store and share code using Git.

**Clone** (in Git) — Making a copy of code from GitHub to your computer.

**MCP** — Model Context Protocol. A way for AI assistants to talk to tools and systems.

**Node.js** — Software that lets you run JavaScript code on your computer (like a program engine).

**NPM** — Node Package Manager. A tool for downloading and managing software libraries.

**Path** — The location of a file or folder. Example: `/Users/john/Documents/my-file.txt`

**Absolute Path** — The complete path from the very top of your computer. Example: `/Users/john/ATLAS-GATE-MCP-server/`

**Relative Path** — A path from where you are right now. Example: `docs/README.md` (which file should be in the current folder's `docs` folder)

**Plan** — In ATLAS-GATE MCP, a plan is a detailed description of changes you approve before they happen.

**Repository** — A folder containing all the code and history for a project. Often called a "repo."

**Root** — The top level. "Project root" means the main folder of the project.

**Role** — Different responsibilities or permissions. ATLAS-GATE MCP has "WINDSURF" (executor) and "ANTIGRAVITY" (planner) roles.

**Script** — A file containing commands to run. When you run a script, it runs many commands automatically.

**Verify** — Check that something is correct and working.

**Workspace** — The folder where you're working. Your project folder.

**Zero-Trust** — A security approach that doesn't trust anything by default. Everything must be verified.

---

## Troubleshooting

### Problem: "Node.js is not recognized" or "`node: command not found`"

**Cause:** Node.js isn't installed or not found.

**Solution:**
1. Go back to the installation section and install Node.js properly
2. Restart your Terminal completely (close and reopen)
3. Try again

**Verify:**
```bash
node --version
```

Should show a version like `v18.0.0`

---

### Problem: "Git is not recognized" or "`git: command not found`"

**Cause:** Git isn't installed.

**Solution:**
1. Install Git (see installation section)
2. Restart your Terminal
3. Try again

---

### Problem: "`npm install` fails with errors"

**Cause:** Could be many things. Usually a network issue or Node.js problem.

**Solution:**
1. Make sure you're in the `ATLAS-GATE-MCP-server` folder (run `ls` or `dir` and look for `package.json`)
2. Try again:
```bash
npm install
```
3. If it still fails, try:
```bash
npm install --no-optional
```

---

### Problem: "ATLAS-GATE_BOOTSTRAP_SECRET is not set"

**Cause:** You haven't set the environment variable yet, or you opened a new Terminal window.

**Solution:**
1. In the **same Terminal window**, run:

**Windows:**
```powershell
$env:ATLAS-GATE_BOOTSTRAP_SECRET = "your-secret-here"
```

**Mac/Linux:**
```bash
export ATLAS-GATE_BOOTSTRAP_SECRET="your-secret-here"
```

2. You **must do this every time** you open a new Terminal window
3. Then try your command again

---

### Problem: I'm getting "Permission denied" errors

**Cause:** Your user account doesn't have permission to run scripts.

**Solution (Windows PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Solution (Mac/Linux):**
```bash
chmod +x scripts/setup-bootstrap.sh
bash scripts/setup-bootstrap.sh
```

---

### Problem: Tests are failing

**Cause:** Usually means something in the setup isn't right.

**Steps to fix:**
1. Make sure Node.js and Git are installed correctly
2. Make sure ATLAS-GATE_BOOTSTRAP_SECRET is set
3. Make sure you're in the right folder (you should see `package.json` when you run `ls` or `dir`)
4. Delete the `node_modules` folder and try again:

**Windows:**
```powershell
Remove-Item -Recurse node_modules
npm install
```

**Mac/Linux:**
```bash
rm -rf node_modules
npm install
```

---

### Problem: "Absolute path not found" or configuration errors

**Cause:** You didn't use an absolute path (the full path from the top of your computer).

**Solution:**
Find your absolute path:

**Windows (PowerShell):**
```powershell
Get-Location
```

**Mac/Linux:**
```bash
pwd
```

Copy the result and use it. For example:
- Windows: `C:\Users\John\ATLAS-GATE-MCP-server`
- Mac: `/Users/john/ATLAS-GATE-MCP-server`
- Linux: `/home/john/ATLAS-GATE-MCP-server`

---

### Problem: I don't know what error message means

**Steps:**
1. Read the error message carefully (it's usually helpful)
2. Search the [Glossary](#glossary-for-humans) for unfamiliar terms
3. Check the [Troubleshooting](#troubleshooting) section (you might not be alone)
4. Ask in [GitHub Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/discussions)

---

## Next Steps

Now that you have ATLAS-GATE MCP installed and verified:

1. **Read the quick reference**: [MCP Quick Reference](./MCP_QUICK_REFERENCE.md) (1 page)
2. **Configure your AI client**: See the main [README.md](../README.md#configuration) 
3. **Learn the concepts**: [Architecture Overview](./ARCHITECTURE.md)
4. **Ask questions**: [GitHub Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/discussions)

---

**Still stuck?** Create an issue at [GitHub Issues](https://github.com/dylanmarriner/ATLAS-GATE-MCP-server/issues) with:
- What you tried
- What happened
- Which operating system you're using
- Any error messages (copy and paste them)

We're here to help.
