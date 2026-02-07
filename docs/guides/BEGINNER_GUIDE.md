---
title: "Complete Beginner's Guide to ATLAS-GATE MCP"
description: "Step-by-step guide for complete beginners who have never used a computer before"
version: "1.0.0"
last_updated: "2026-01-19"
review_date: "2026-04-19"
owners: ["documentation-team"]
tags: ["beginner", "guide", "tutorial", "getting-started"]
audience: ["beginner", "non-technical"]
---

# Complete Beginner's Guide to ATLAS-GATE MCP

## Purpose

This guide teaches you how to use ATLAS-GATE MCP starting from absolute zero computer experience. No prior knowledge is assumed. Every term is explained the first time it appears.

## What You Will Learn

- How to turn on a computer and connect to the internet
- How to install and use a web browser
- How to install required software tools
- How to download and set up ATLAS-GATE MCP
- How to use ATLAS-GATE MCP step by step
- How to troubleshoot common problems

## Learning Paths

### 🚀 Fast Path (30 minutes)
If you're comfortable with computers, follow the highlighted sections:
- **Section 1**: Quick Setup
- **Section 3**: Install ATLAS-GATE MCP
- **Section 5**: First Use

### 📚 Step-by-Step with Explanations (2 hours)
Complete beginner? Follow every section in order:
- All sections with detailed explanations
- Every command explained
- Troubleshooting included

### 🔧 Troubleshooting as You Go (3 hours)
New to computers? Follow this path:
- All sections plus troubleshooting tips
- Extra help for common problems
- Detailed error explanations

---

## Section 1: Computer Basics

### 1.1 Turning On Your Computer

**A computer** is an electronic device that runs programs and stores information.

#### For Desktop Computers:
1. Find the power button (usually on the computer case or monitor)
2. Press the power button once
3. Wait for the computer to start up (this may take 1-3 minutes)

#### For Laptop Computers:
1. Open the laptop lid
2. Press the power button (usually above the keyboard)
3. Wait for the computer to start up

### 1.2 Using a Mouse or Trackpad

**A mouse** is a device that moves a pointer on the screen.
**A trackpad** is a touch-sensitive area on a laptop that works like a mouse.

**Basic actions:**
- **Click**: Press and release the left mouse button once
- **Double-click**: Press and release the left button twice quickly
- **Right-click**: Press and release the right mouse button once
- **Scroll**: Use the scroll wheel or two-finger swipe on trackpad

### 1.3 Understanding the Screen

**Desktop**: The main screen area with icons
**Icon**: Small picture representing a program or file
**Window**: A box that shows a program's content
**Taskbar**: The bar at the bottom of the screen (Windows) or top (Mac)
**Start Menu**: Button to access programs (Windows) or **Applications** folder (Mac)

---

## Section 2: Internet and Web Browser

### 2.1 Connecting to the Internet

**Internet**: A global network that connects computers worldwide.

#### Wi-Fi Connection (Wireless):
1. Look for Wi-Fi icon (looks like radio waves)
2. Click on the Wi-Fi icon
3. Select your network name from the list
4. Enter your password if required
5. Wait for "Connected" status

#### Ethernet Connection (Wired):
1. Find the Ethernet port (looks like a phone jack but wider)
2. Plug in the Ethernet cable
3. Connection should work automatically

### 2.2 Installing a Web Browser

**Web browser**: A program to access websites (like Chrome, Firefox, or Safari).

#### Checking if You Have a Browser:
1. Look for icons named "Chrome", "Firefox", "Safari", or "Edge"
2. If you see one, you already have a browser
3. If not, follow the installation steps below

#### Installing Google Chrome (Recommended):
1. **If you have a browser**: Go to https://www.google.com/chrome
2. **If you have no browser**: Use the computer's built-in browser or ask for help
3. Click "Download Chrome"
4. Click "Accept and Install"
5. Wait for download to complete
6. Double-click the downloaded file
7. Follow the installation instructions
8. Restart your computer when asked

### 2.3 Using a Web Browser

**Basic browser actions:**
- **Address bar**: White bar at top where you type website addresses
- **Link**: Text or picture you can click to go to another page
- **Tab**: Multiple pages open in same window
- **Back button**: Go to previous page
- **Refresh button**: Reload the current page

---

## Section 3: Installing Required Software

### 3.1 What is a Terminal?

**Terminal**: A text-based interface where you type commands to the computer.
**Command**: An instruction you type to tell the computer what to do.

#### Why We Need Terminal:
ATLAS-GATE MCP installation requires typing commands. This is normal for developer tools.

### 3.2 Opening Terminal

#### On Windows:
1. Press **Windows key + R**
2. Type `cmd` and press Enter
3. A black window opens - this is the Command Prompt
4. Alternatively, search for "PowerShell" in Start Menu

#### On macOS:
1. Click the magnifying glass icon (Spotlight search)
2. Type `terminal` and press Enter
3. A white window opens - this is the Terminal

#### On Linux:
1. Press **Ctrl + Alt + T**
2. Or search for "Terminal" in applications

### 3.3 Installing Node.js

**Node.js**: A program that runs JavaScript code on computers. ATLAS-GATE MCP needs this to work.

#### Step 1: Check if Node.js is Already Installed
Type this command in terminal and press Enter:

```bash
node --version
```

**What you might see:**
- If you see `v18.x.x` or higher: Node.js is already installed. Skip to Section 4.
- If you see "command not found": Node.js is not installed. Continue below.

#### Step 2: Download Node.js
1. Open your web browser
2. Go to https://nodejs.org
3. Click the green "LTS" button (LTS means Long-Term Support - most stable version)
4. Wait for download to complete

#### Step 3: Install Node.js

**On Windows:**
1. Double-click the downloaded `.msi` file
2. Click "Next" through all options
3. Click "Install"
4. Wait for installation to complete
5. Click "Finish"

**On macOS:**
1. Double-click the downloaded `.pkg` file
2. Follow the installation instructions
3. Enter your password if asked
4. Wait for installation to complete

#### Step 4: Verify Installation
Close and reopen terminal, then type:

```bash
node --version
npm --version
```

You should see version numbers like `v18.x.x` and `9.x.x`. If so, installation was successful.

### 3.4 Installing Git

**Git**: A tool for downloading and managing code from websites like GitHub.

#### Step 1: Check if Git is Already Installed
Type this command:

```bash
git --version
```

**What you might see:**
- If you see version number: Git is installed. Skip to Section 4.
- If you see "command not found": Git is not installed. Continue below.

#### Step 2: Download Git
1. Open web browser
2. Go to https://git-scm.com
3. Click "Downloads"
4. Download the version for your operating system

#### Step 3: Install Git

**On Windows:**
1. Double-click the downloaded `.exe` file
2. Click "Next" through all options (use defaults)
3. Click "Install"
4. Click "Finish"

**On macOS:**
1. Double-click the downloaded `.dmg` file
2. Double-click the installer package
3. Follow installation instructions
4. Enter password if asked

#### Step 4: Verify Installation
Close and reopen terminal, then type:

```bash
git --version
```

You should see a version number. If so, installation was successful.

---

## Section 4: Downloading ATLAS-GATE MCP

### 4.1 What is ATLAS-GATE MCP?

**ATLAS-GATE MCP**: A security tool that controls how AI assistants write code. It makes sure AI assistants only make approved changes.

### 4.2 Creating a Project Folder

**Folder**: A container for organizing files on your computer.

#### Step 1: Create Project Folder
**On Windows:**
1. Open File Explorer (folder icon in taskbar)
2. Click "This PC" or "Documents"
3. Right-click in empty space
4. Select "New" → "Folder"
5. Type `atlas-gate-project` and press Enter

**On macOS/Linux:**
1. Open Finder (file cabinet icon)
2. Go to Documents folder
3. Right-click in empty space
4. Select "New Folder"
5. Type `atlas-gate-project` and press Enter

#### Step 2: Navigate to Folder in Terminal
Type this command and press Enter:

**On Windows:**
```bash
cd Documents\atlas-gate-project
```

**On macOS/Linux:**
```bash
cd Documents/atlas-gate-project
```

**What this does:**
- `cd` means "change directory" (move to a folder)
- The path tells it which folder to go to
- You should now be in your project folder

### 4.3 Downloading ATLAS-GATE MCP

#### Method 1: Using Git (Recommended)
Type this command exactly as shown:

```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP-server.git
```

**What this does:**
- `git clone` downloads code from GitHub
- The long web address is where the code is stored
- This creates a folder called `ATLAS-GATE-MCP-server`

#### Method 2: Using ZIP File (If Git Doesn't Work)
1. Open web browser
2. Go to https://github.com/dylanmarriner/ATLAS-GATE-MCP-server
3. Click green "Code" button
4. Click "Download ZIP"
5. Wait for download to complete
6. Find the downloaded file (usually in Downloads folder)
7. Right-click the file and select "Extract All" or "Unzip"
8. Move the extracted folder to your atlas-gate-project folder

### 4.4 Navigating to ATLAS-GATE MCP Folder
Type this command:

**On Windows:**
```bash
cd ATLAS-GATE-MCP-server
```

**On macOS/Linux:**
```bash
cd ATLAS-GATE-MCP-server
```

You should now be in the ATLAS-GATE MCP folder. To verify, type:

```bash
ls
```

**On Windows, use:**
```bash
dir
```

You should see a list of files and folders including `package.json`, `README.md`, and others.

---

## Section 5: Installing ATLAS-GATE MCP

### 5.1 What is npm?

**npm**: Node Package Manager - a tool that installs and manages JavaScript programs.

### 5.2 Installing Dependencies

**Dependencies**: Additional programs that ATLAS-GATE MCP needs to work.

Type this command and press Enter:

```bash
npm install
```

**What this does:**
- `npm install` reads the `package.json` file
- Downloads all required programs
- May take 1-5 minutes depending on internet speed

**What you'll see:**
- Lots of text scrolling by
- Progress bars or percentage indicators
- Eventually it will stop and show a command prompt

**If you see errors:**
- Make sure you're in the correct folder (Section 4.4)
- Make sure Node.js is installed (Section 3.3)
- Try running the command again

### 5.3 Verifying Installation

Type this command to test the installation:

```bash
npm run verify
```

**What this does:**
- Runs a series of tests to make sure everything works
- Checks all components are working correctly
- Should show "All tests passed" or similar message

**If tests pass**: Installation was successful!
**If tests fail**: Check the troubleshooting section below.

---

## Section 6: First Use of ATLAS-GATE MCP

### 6.1 Understanding the Concept

ATLAS-GATE MCP works with AI assistants like Claude Desktop or Windsurf. It acts as a security guard between the AI and your files.

### 6.2 Basic Configuration

#### Step 1: Create Configuration File
ATLAS-GATE MCP needs a configuration file to work with your AI assistant.

Type this command to create a basic configuration:

```bash
echo '{"mcpServers": {"atlas-gate": {"command": "node", "args": ["'"$(pwd)"'/server.js"]}}}' > config.json
```

**What this does:**
- Creates a file called `config.json`
- Tells AI assistants how to find ATLAS-GATE MCP
- Uses the current folder path automatically

#### Step 2: Test Configuration
Type this command to test:

```bash
node server.js
```

**What you should see:**
- Some startup messages
- No error messages
- The program should start and wait for connections

**Press Ctrl+C to stop the program.**

### 6.3 Understanding the Two Roles

ATLAS-GATE MCP has two roles:

**ANTIGRAVITY (Planning Role):**
- For planning and designing changes
- Can read files but cannot modify them
- Creates plans for what to do

**WINDSURF (Execution Role):**
- For making actual changes to files
- Can only execute approved plans
- Logs all changes for security

### 6.4 Your First Session

#### Step 1: Start a Session
In your AI assistant (Claude Desktop/Windsurf), configure it to use ATLAS-GATE MCP using the `config.json` file you created.

#### Step 2: Begin Session
Type this to your AI assistant:
```
"Please use ATLAS-GATE MCP to begin a session in this folder. Use the begin_session tool to lock the workspace."
```

#### Step 3: Plan Something (ANTIGRAVITY Role)
```
"Switch to ANTIGRAVITY role and create a plan to add a hello.txt file with the text 'Hello World'."
```

#### Step 4: Execute the Plan (WINDSURF Role)
```
"Switch to WINDSURF role and execute the plan to create hello.txt."
```

#### Step 5: Check Results
You should now have a file called `hello.txt` in your folder with "Hello World" inside.

---

## Section 7: Common Problems and Solutions

### 7.1 "Command Not Found" Errors

**Problem**: Terminal says "command not found" when you type commands.

**Solution**:
1. Make sure you're in the correct folder (Section 4.4)
2. Verify software is installed (Sections 3.3 and 3.4)
3. Restart terminal and try again
4. Check spelling of commands

### 7.2 Permission Errors

**Problem**: "Permission denied" or "access denied" errors.

**Solution**:
1. Make sure you're using a user account with admin rights
2. On Windows: Right-click terminal and "Run as administrator"
3. On macOS/Linux: Try `sudo` before the command (if you know the password)

### 7.3 Network Errors

**Problem**: "Network unreachable" or "connection failed" errors.

**Solution**:
1. Check internet connection (Section 2.1)
2. Try a different network
3. Check if firewall is blocking the connection
4. Wait and try again later

### 7.4 Installation Fails

**Problem**: npm install fails with errors.

**Solution**:
1. Make sure Node.js is properly installed (Section 3.3)
2. Try `npm cache clean --force` then `npm install` again
3. Check if you're in the correct folder
4. Try downloading a fresh copy of ATLAS-GATE MCP

### 7.5 Tests Fail

**Problem**: `npm run verify` shows test failures.

**Solution**:
1. Make sure all dependencies installed (Section 5.2)
2. Check if you have the correct Node.js version (18 or higher)
3. Try updating Node.js to the latest version
4. Check the specific error message for clues

---

## Section 8: Next Steps

### 8.1 Learning More

Now that you have ATLAS-GATE MCP working, you can:

1. **Read the main README.md file** for more advanced features
2. **Try the examples** in the documentation
3. **Join the community** for help and discussions
4. **Explore the ADRs** to understand design decisions

### 8.2 Using ATLAS-GATE MCP in Projects

**For personal projects:**
- Use it to control AI assistants in your coding projects
- Keep your code safe and organized
- Track all changes automatically

**For team projects:**
- Share the configuration with your team
- Use it to review AI-generated code
- Maintain security and compliance

### 8.3 Getting Help

If you need help:

1. **Check the documentation** in the `/docs/` folder
2. **Search the GitHub Issues** for similar problems
3. **Ask questions in GitHub Discussions**
4. **Report bugs** using GitHub Issues

---

## Section 9: Glossary for Humans

**API**: Application Programming Interface - how programs talk to each other  
**Authentication**: Proving who you are  
**Authorization**: What you're allowed to do  
**Command**: An instruction you type in terminal  
**Configuration**: Settings that control how a program works  
**Dependency**: A program that another program needs to work  
**Directory**: Another word for folder  
**Execute**: Run a program or command  
**File**: Information stored on your computer with a name  
**Folder**: Container for organizing files  
**Git**: Tool for managing code versions  
**GitHub**: Website for storing and sharing code  
**Install**: Put a program on your computer so you can use it  
**Internet**: Global network connecting computers  
**JavaScript**: Programming language used for web and Node.js  
**JSON**: Way to store information in text format  
**Node.js**: Program that runs JavaScript on computers  
**npm**: Tool for installing JavaScript programs  
**Package**: A collection of programs that work together  
**Path**: Location of a file or folder on your computer  
**Repository**: Storage place for code and files  
**Server**: Program that provides services to other programs  
**Session**: Period of time when you're using a program  
**Terminal**: Text-based interface for typing commands  
**Workspace**: Folder where you're working on a project  

---

## Section 10: Safety and Data Handling

### 10.1 Protecting Your Information

**Never share these files with others:**
- Configuration files with personal information
- Files containing passwords or API keys
- Private project files

**Keep these safe:**
- Your computer password
- Any API keys or tokens
- Personal information in configuration files

### 10.2 API Keys and Secrets

**API Key**: Special password that lets programs talk to each other.

**Rules for API keys:**
- Never put API keys in code you share
- Never tell anyone your API keys
- Store API keys in environment variables, not in files
- Use different keys for different projects

### 10.3 Safe Defaults

ATLAS-GATE MCP is designed to be safe by default:
- It requires explicit approval for all changes
- It logs everything that happens
- It prevents dangerous operations automatically
- It separates planning from execution

### 10.4 What to Do If Something Goes Wrong

**If you see unexpected changes:**
1. Check the audit log to see what happened
2. Revert changes using Git if needed
3. Review your configuration
4. Ask for help in the community

**If you think someone accessed your system:**
1. Change all your passwords
2. Revoke any API keys
3. Check your audit logs
4. Report security issues privately

---

## Conclusion

Congratulations! You now have:

✅ Turned on a computer and connected to the internet  
✅ Installed a web browser  
✅ Used the terminal for the first time  
✅ Installed Node.js and Git  
✅ Downloaded and installed ATLAS-GATE MCP  
✅ Used ATLAS-GATE MCP for the first time  
✅ Learned troubleshooting basics  

You're ready to use ATLAS-GATE MCP to safely control AI assistants in your projects!

---

**Need Help?**
- **Documentation**: Check the `/docs/` folder for detailed guides
- **Community**: Join discussions on GitHub
- **Issues**: Report problems on GitHub Issues
- **Security**: Report security issues privately

**Remember**: Everyone starts as a beginner. With practice, using these tools becomes natural. Keep learning and exploring!
