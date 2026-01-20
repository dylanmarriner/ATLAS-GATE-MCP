---
title: "KAIZA MCP Glossary for Humans"
description: "Plain-English definitions of all technical terms used in KAIZA MCP"
version: "1.0.0"
last_updated: "2026-01-20"
audience: ["all"]
---

# KAIZA MCP Glossary for Humans

Plain-English definitions of every technical term you'll encounter. Each term is defined on first use, but you can look them up here anytime.

---

## A

**Antigravity**
One of two role types in KAIZA MCP. An AI agent running in Antigravity mode can create plans and read code, but cannot execute changes. Like a architect who designs buildings but doesn't build them.

**API** (Application Programming Interface)
A set of rules that lets different software programs talk to each other. Think of it as a phone number you call to ask a service to do something. Example: "Call the write_file API with these parameters."

**Approval**
The action of saying "Yes, this plan looks good. You can execute it." In KAIZA, approval happens when the Antigravity role creates a plan and the Windsurf role receives it.

**Audit Log**
A permanent record of everything that happened: who did what, when they did it, and what changed. Like a security camera for your code. Every change in KAIZA is logged here.

**Authorization**
Permission. "Do I have permission to do this action?" In KAIZA, authorization is enforced by plans—you can only do what the plan allows.

---

## B

**Bootstrap**
To start something from scratch. In KAIZA, "bootstrapping a plan" means creating the very first plan that will guide all future changes.

**Boundary Tool** (in context of governance)
A tool that can read and check things but can't modify them. Like a quality inspector—they look at your work but can't change it.

---

## C

**CLI** / **Command Line Interface**
Text-based way to tell your computer what to do. You type commands instead of clicking buttons. Example: `npm install`

**Client**
Software that connects to another service. Your MCP client (Claude Desktop, Windsurf) is a "client" that connects to KAIZA MCP "server."

**Compliance**
Following the rules. In KAIZA, "compliance" means all changes follow the governance model (you have plans, audits, approvals).

**Cryptographic** / **Cryptography**
Advanced math used to lock and verify data. Like an unbreakable code. Used in KAIZA to create secure signatures on audit logs.

**Cursor**
The blinking line in your terminal showing where you are (where the next character you type will appear).

---

## D

**Deprecate** / **Deprecated**
Mark something as old and no longer recommended. "We're deprecating this feature—it still works, but we have something better. Stop using this in new code." Deprecation usually happens before something is removed entirely.

**Directory**
A folder. Contains files or other folders. Example: `/docs/guides/` is a directory.

**Dual-Role**
KAIZA's core design: two separate roles with different permissions. Antigravity (planning) and Windsurf (execution) cannot be the same entity—they're separate checks and balances.

---

## E

**Enforcement**
Making sure rules are followed. In KAIZA, "enforcement" means the system actually prevents you from doing unauthorized things—not just warns you.

**Epoch** / **Unix Timestamp**
A specific moment in time, usually measured as seconds since January 1, 1970. Computers use this for consistent time tracking. KAIZA logs use Unix timestamps so events can be sequenced precisely.

**Error**
Something went wrong. The program is telling you what broke and (hopefully) how to fix it.

**Execute** / **Execution**
Run a command or program. "Execute the plan" means "Run the plan and make the authorized changes."

---

## G

**Governance**
Rules and controls. "Who can do what, and how do we prove it happened?" KAIZA enforces governance—it makes sure the right people approved the right changes in the right way.

**Git**
Version control system. Tracks changes to code over time. Like "Track Changes" in Microsoft Word, but for code and programmers. Every change is recorded; you can rewind.

**GitHub**
Website where code is stored and shared (Git + Hub = GitHub). https://github.com/ is where KAIZA MCP's code lives.

**Hash** / **Hashing**
A math function that turns data into a unique fingerprint. Same data = same hash. Change one character = completely different hash. Used in KAIZA to prove data hasn't been tampered with.

**Hex** / **Hexadecimal**
Numbering system using 0–9 and A–F. Easier for computers than decimal (0–9). Example: the plan hash might be `a1b2c3d4e5f6...` (all hex).

---

## I

**Immutable**
Cannot be changed. "An immutable audit log" means once something is logged, it cannot be deleted or edited.

**Initialize** / **Initialization**
Set up or start. "Initialize a session" means "Start a work session." In KAIZA, initialization happens with `begin_session`.

**Infrastructure Tool** (in context of governance)
A tool used for system setup and maintenance, not for changing production code. Like the scaffolding on a construction site—it's part of the project but not the final building.

**Integrity**
Data hasn't been tampered with. "Verify integrity" means "Make sure nothing was secretly changed." KAIZA uses hash chains to verify integrity.

**Intent**
Your purpose or reason. "What's your intent for this change?" means "Why are you making this change?" KAIZA requires you to state your intent in plans.

---

## J

**JSON** (JavaScript Object Notation)
Human-readable format for storing data. Looks like:
```json
{
  "name": "John",
  "age": 30,
  "roles": ["admin", "user"]
}
```

---

## L

**Lock** / **Locking**
Preventing something from being changed. When KAIZA "locks" a session, it means no more changes can happen until certain conditions are met. Like putting a file in read-only mode.

**LTS** (Long-Term Support)
Version supported for a long time (usually 2+ years) with bug fixes. KAIZA 1.0.0 is LTS—you can rely on it for 24 months.

---

## M

**Metadata**
Data about data. Information that describes something else. Example: a file's metadata includes its creation date, size, owner—information about the file itself, not its contents.

**MCP** (Model Context Protocol)
Standard way for AI assistants (like Claude) to interact with tools and systems. KAIZA MCP = KAIZA using the MCP standard. This lets KAIZA work with multiple AI clients.

**Mermaid**
A tool for creating diagrams using text-based syntax. KAIZA diagrams are written in Mermaid format.

**Metrics**
Measurements. "What are your success metrics?" means "How will we know if this worked?"

**Migration**
Moving from one system to another. "Migrate from v1 to v2" means "Switch to the new version and move your data."

**Module**
A piece of code that does one job. Like a module in a building (electrical, plumbing)—each module handles one function.

---

## N

**Node.js**
Runtime that lets JavaScript (a programming language) run on computers, outside web browsers. KAIZA is written in Node.js.

**npm** (Node Package Manager)
Tool to download and manage code libraries. Like an app store for programmers. Commands like `npm install` download packages.

---

## O

**OAuth**
Secure way to give an app permission to access your account without sharing your password. "Login with Google" uses OAuth.

**Operation**
An action or change. "What operation did you perform?" = "What did you do?" In KAIZA, operations are logged (write_file, read_file, etc.).

**Operability**
Ease of running and maintaining something. "How operable is this system?" = "How hard is it to keep this running?"

**Ownership**
Someone is responsible for maintaining something. "Who owns this code?" = "Who is responsible for fixing bugs in this code?"

---

## P

**Package**
A bundle of code ready to install. Like a package from Amazon. `npm install {package-name}` downloads a package.

**Path**
Address of a file or folder. Like a mailing address. Examples:
- `/Users/yourname/KAIZA-MCP-server/` (macOS)
- `C:\Users\yourname\KAIZA-MCP-server` (Windows)
- `/home/yourname/KAIZA-MCP-server` (Linux)

**Permission**
Can you do this action? Read (look at), write (change), execute (run)?

**Plan** / **Plan Hash**
In KAIZA MCP, a detailed instruction for what changes should happen. Plans are identified by a hash (unique fingerprint). Example: A plan to "Add login feature" gets a hash like `a1b2c3d4...` that proves which exact plan you approved.

**Policy**
Rules about how things work. "Our policy is that all changes require approval" means "We require approval for all changes."

**Prompt**
Text you send to Claude (or another AI) asking it to do something. Your words asking the AI for help.

**Provisioning**
Setting up resources or systems. "Provisioning a server" means creating and configuring a server.

---

## R

**RBAC** (Role-Based Access Control)
System where people have roles (e.g., "Admin", "User") and roles have permissions. Admin can do everything; User can do less. KAIZA uses RBAC with roles like Antigravity and Windsurf.

**Replay** / **Forensic Replay**
Playing back events in order to see what happened. KAIZA can replay execution from the audit log: "Show me exactly what happened in step 1, 2, 3..."

**Repo** / **Repository**
A folder containing a project (usually code). On GitHub, a repo is like a folder shared online.

**Resource**
Something that consumes computer power: memory, CPU, disk space, network. "This operation uses a lot of resources" = "This operation needs a powerful computer."

**Role**
A job title with specific permissions. Examples: Admin, User, Editor. KAIZA has roles like Antigravity (planning) and Windsurf (execution).

**Rollback**
Undoing changes. "If the deployment fails, we can rollback to the previous version" means "We can undo the changes and go back to what we had before."

---

## S

**Schema**
Structure or blueprint. "This data follows this schema" = "The data is shaped like I expect." Like a template.

**Scope**
The boundaries of something. "What's the scope of this plan?" = "What will this plan do and what will it NOT do?"

**SDKs** (Software Development Kits)
Tools and code libraries for building software. The MCP SDK is code that helps build MCP clients and servers.

**Security**
Protection against bad actors. In KAIZA, security includes encryption, authorization, audit trails.

**Self-Audit** / **Self-Testing**
Testing your own code. KAIZA runs self-audits to make sure it's following its own rules.

**Session**
A work period. When you start working until you stop. In KAIZA, a session begins with `begin_session` and continues until you close your client.

**SHA** / **SHA256**
Specific type of hash function (very secure, standardized). KAIZA uses SHA256 to create plan hashes and audit log signatures.

**Signature** / **Signed**
Cryptographic proof that something is authentic. "This document is signed" = "I promise this is real and hasn't been edited."

**SLA** (Service Level Agreement)
A promise about availability. "99.99% SLA" means "We promise the service is available 99.99% of the time."

**SOC 2**
Security standard for companies handling customer data. "SOC 2 compliance" means "We've been audited and meet security standards."

**Source** (in diagram context)
The editable, human-readable file. The "source" diagram is the `.mmd` file you edit; the "rendered" diagram is the `.svg` output for viewing.

**Stack**
Technology layers used in a system. "Tech stack: Node.js, Express, MongoDB" = "We use Node.js for runtime, Express for web server, MongoDB for database."

**Stakeholder**
Someone with interest in a decision. "Who are the stakeholders?" = "Who will be affected by this decision?"

**State**
Current condition. "The state of the system is running" = "The system is currently running."

**Supersede** / **Superseded**
Replace with something newer. "This API is superseded by API v2" = "Use API v2 instead; the old API is outdated."

**SVG** (Scalable Vector Graphics)
Image format for diagrams and logos. Unlike PNG/JPG (pixels), SVG is math-based so it scales to any size without getting blurry.

---

## T

**TAM** (Total Addressable Market)
Total market size. "What's the TAM for this product?" = "How many customers could possibly use this?"

**Tamper-Proof**
Cannot be secretly changed without detection. KAIZA's audit log is tamper-proof because changes would break the hash chain.

**Terminal**
Command-line interface. The program where you type commands (like Command Prompt on Windows or Terminal on macOS).

**Threat Model**
Analysis of "What bad things could happen and how can we prevent them?" Security teams create threat models.

**Timestamp**
Date and time something happened. Example: `2026-01-20T15:30:00Z` (ISO format).

**Traceability**
Ability to trace something. "Can you trace this change back to the original request?" KAIZA provides traceability through audit logs.

**Tool**
In KAIZA MCP context, a callable function. Examples: write_file, read_file, generate_attestation_bundle are tools.

**Trust** / **Zero-Trust**
Zero-trust means: don't trust anything automatically. Verify everything. KAIZA is zero-trust: every operation requires authorization.

---

## U

**URI** / **URL**
Address on the internet. Examples:
- `https://github.com/dylanmarriner/KAIZA-MCP-server`
- `file:///docs/GLOSSARY.md`

---

## V

**Validation**
Check that something is correct. "Validate this data" = "Check that it's in the right format."

**Verify** / **Verification**
Prove something is true. "Verify your email" = "Prove you own this email." KAIZA verifies attestation bundles to prove they're authentic.

**Versioning**
Tracking different versions. v1.0, v1.1, v2.0, etc. KAIZA uses semantic versioning: major.minor.patch.

**Vulnerability**
A weakness that could be exploited. "This code has a SQL injection vulnerability" = "Someone could exploit this to attack the system."

---

## W

**Windsurf**
One of two role types in KAIZA MCP (also an MCP client application). An AI agent running in Windsurf mode can execute approved plans and make changes. Like a contractor who builds according to an architect's blueprints.

**Workflow**
A series of steps to accomplish something. "Our deployment workflow: test → review → approve → deploy"

**Workspace**
Your project folder. Everything for one project lives here. The workspace root is the top-level folder.

---

## X

(No terms starting with X in KAIZA MCP glossary)

---

## Y

(No terms starting with Y in KAIZA MCP glossary)

---

## Z

**Zero-Trust**
Security philosophy: assume nothing is trustworthy. Verify everything. Don't give implicit permission—require explicit authorization for every action.

---

## Related Documents

- [Absolute Beginner's Guide](./guides/ABSOLUTE_BEGINNER_GUIDE.md) — Definitions are used throughout
- [DOCUMENTATION_CHANGELOG.md](./DOCUMENTATION_CHANGELOG.md) — Explains versioning terms
- [SECURITY.md](../SECURITY.md) — Security-specific terms
- [adr/STATUS_TAXONOMY.md](../adr/STATUS_TAXONOMY.md) — ADR-specific terms

---

**Document Owner:** KAIZA MCP Documentation Team  
**Last Updated:** 2026-01-20  
**Version:** 1.0.0
