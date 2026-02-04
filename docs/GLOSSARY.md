# GLOSSARY: Terms Explained for Non-Technical Users

This glossary explains technical terms used throughout ATLAS-GATE-MCP documentation in plain, everyday language. **No jargon. No assumptions about technical knowledge.**

---

## A

### **AI (Artificial Intelligence)**
A computer program that can think, learn, and make decisions. Examples: ChatGPT, Claude, Windsurf. Think of it like a very smart assistant that can understand language and solve problems.

### **API (Application Programming Interface)**
A standardized way for programs to talk to each other. Like a telephone system—the phone company doesn't need to know what you're saying, just how to route the call correctly. ATLAS-GATE-MCP is an API that AI assistants use.

### **Authorization**
Permission to do something. Before the AI can write a file, ATLAS-GATE-MCP checks: "Do we have permission?" If yes, it proceeds. If no, it stops.

### **Audit / Audit Trail**
A complete, detailed record of what happened. Like a security camera recording everything that occurs. **Key feature: You can't erase or hide audit records.** If something goes wrong, auditors can review exactly what the AI did.

---

## B

### **Backup**
A copy of important data or files stored in a safe place. If something breaks, you can restore from backup. Like having a duplicate set of house keys in case you lose the original.

### **Baseline**
The starting point for comparison. "What did the system look like before the AI made changes?" That's the baseline.

---

## C

### **Compliance / Compliant**
Following the rules. A company is "compliant" with GDPR if it follows GDPR's rules. ATLAS-GATE-MCP helps organizations be compliant by keeping records and controlling access.

### **Cryptographic / Cryptography**
A mathematical way to make sure something hasn't been changed. Like a unique fingerprint on a document—if anyone modifies the document, the fingerprint changes and you know it's been tampered with.

### **Control / Security Control**
A rule or process that prevents bad things from happening. Example: "No AI can write code without approval"—that's a control. Controls reduce risk.

---

## D

### **Database**
An organized collection of information. Like a filing cabinet where data is stored in a way that's easy to find and update. ATLAS-GATE-MCP can keep audit logs in a database.

### **Deployment**
Installing and running software in a production environment (the real, live system that people use). Before deployment, you test locally. After deployment, it's live.

### **Disaster Recovery (DR)**
The plan for what happens when something goes catastrophically wrong. "If the server catches fire, how do we restore service?" A good DR plan means you never lose critical data.

---

## E

### **Encryption**
Scrambling information so only authorized people can read it. Like writing a secret code—without the key, the message looks like gibberish. Even if someone steals the encrypted file, they can't read it.

### **Enterprise / Enterprise-Grade**
Large organization (like a Fortune 500 company). "Enterprise-grade" means built to handle the demands of large organizations: high security, lots of users, compliance requirements, 24/7 availability.

---

## F

### **Firewall**
A security system that controls what data can enter or leave a network. Like a security guard at a building entrance—they check each person to make sure they're allowed in.

### **Framework**
A structure or system that provides the foundation for building something. ATLAS-GATE-MCP is a framework for controlling AI assistants.

---

## G

### **Governance**
The rules, processes, and authority structure for making decisions. "Who approves changes?" "What happens if someone breaks a rule?" Those are governance questions.

### **GDPR (General Data Protection Regulation)**
European Union law protecting personal data. If your company handles data of EU residents, you must follow GDPR. Violations can result in massive fines. ATLAS-GATE-MCP helps with GDPR compliance.

---

## H

### **Hash / Hashing**
A mathematical function that converts any data into a unique code (like a fingerprint). Two identical files will always produce the same hash. If even one character changes, the hash changes. This helps detect unauthorized modifications.

### **HIPAA (Health Insurance Portability and Accountability Act)**
US law protecting health information privacy. If you handle health data, you must follow HIPAA. ATLAS-GATE-MCP can help organizations achieve HIPAA compliance.

---

## I

### **Immutable / Immutability**
Cannot be changed. An immutable audit log means records can't be edited or deleted—only new records can be added. Like a security camera footage you can't modify.

### **ISO 27001**
International standard for managing information security. Organizations can be "certified" as following ISO 27001. It's a global standard for "we take data security seriously."

### **Integration**
Connecting different systems so they work together. Like connecting your phone to your car—they're separate systems but now integrated to share information.

---

## J

### **JSON (JavaScript Object Notation)**
A standard format for storing and sharing data between systems. Like a universal language computers use to exchange information. Not important to understand the details unless you're a developer.

---

## K

### **Key** (In Context of Cryptography)
A secret code needed to encrypt or decrypt information. Like a password for a safe. Without the key, encrypted data is useless.

---

## L

### **Load Balancing**
Spreading work across multiple servers so no single server gets overwhelmed. Like having multiple checkout lines at a grocery store instead of one long line.

### **Log / Logging**
Recording what happens. When the AI writes a file, the system logs: "At 3:45 PM, AI wrote file X." Logging is how audit trails are created.

---

## M

### **MCP (Model Context Protocol)**
A standard language/format for AI assistants to talk to tools. Think of it like USB—it's a universal standard so different devices can connect to each other. ATLAS-GATE-MCP speaks MCP.

### **Metadata**
Information about information. Example: A file has content (the actual text) and metadata (when it was created, who created it, what size it is).

### **Monitoring**
Continuously watching a system to make sure it's working correctly. Like a hospital monitoring a patient's vital signs.

---

## N

### **Non-repudiation**
The inability to deny something happened. If there's an audit trail proving you did something, you can't claim you didn't—that's non-repudiation. Important for accountability.

---

## O

### **OAuth / OAuth2**
A standard way for services to verify your identity without sharing passwords. When you "log in with Google," that's often OAuth. A secure, standardized approach to authentication.

### **Open-Source**
Software where the source code is publicly available. Anyone can view it, modify it, and redistribute it. ATLAS-GATE-MCP is open-source.

---

## P

### **Parameter**
An input to a function or system. Like a recipe ingredient. "Create a file with these parameters: filename=report.txt, content='Hello'"

### **Plan** (In ATLAS-GATE-MCP context)
A document that authorizes the AI to do certain work. Before the AI modifies production code, there should be a "plan" approved by someone in authority saying "Yes, this work is approved."

### **Policy**
A set of rules about how things should be done. "All code changes require approval"—that's a policy. ATLAS-GATE-MCP enforces policies.

### **Protocol**
A standard way of doing something. Like "the protocol for landing a plane" or "the protocol for responding to security breaches." In computing, a protocol is how systems communicate.

---

## R

### **RBAC (Role-Based Access Control)**
A system where permissions are based on your role. A "Manager" role might have different permissions than a "Developer" role. ATLAS-GATE-MCP uses roles to control what AI assistants can do.

### **Remediation**
Fixing a problem. If a security issue is discovered, the fix is "remediation."

### **Repository / Repo**
A centralized storage location for code and files. This GitHub project is a repository—it stores all the code and documentation in one place.

### **Resilience**
The ability to bounce back from failures. A resilient system continues working even when something breaks.

---

## S

### **Sandbox**
A restricted environment where code runs safely without affecting the main system. Like a sandbox at the beach—things that happen inside don't affect the world outside. ATLAS-GATE-MCP runs in a sandbox for security.

### **Schema**
A structure or blueprint. "What fields does this data have?" That's defined by the schema. Like a blueprint for a house.

### **SOC 2 (Service Organization Control 2)**
An audit framework proving a company has good security controls. Companies get "SOC 2 certified" to prove to customers they take security seriously. ATLAS-GATE-MCP is designed to help organizations achieve SOC 2 compliance.

### **Session**
A period of interaction with a system. Like a phone call—it starts, stuff happens, then it ends. Each AI-ATLAS-GATE interaction is one session with its own context and permissions.

---

## T

### **Tamper-proof / Tamper-evident**
Can't be secretly changed, or any changes are immediately obvious. Like a security seal on a package—you can tell if someone opened it. An immutable audit log is tamper-proof.

### **Threat Model**
Identifying and planning for bad things that could happen. "What if an attacker tries to modify the audit log?" The answer to that is part of the threat model.

### **Token** (In Authentication)
A credential proving you're allowed to do something. Like a ticket to an event—it proves you're authorized. Some AI systems use tokens to authenticate.

### **Traceability**
The ability to trace what happened and why. Complete audit logs provide traceability—you can follow the chain: who did what, when, and why.

---

## V

### **Validation**
Checking that something is correct and safe before proceeding. Before the AI executes code, ATLAS-GATE-MCP validates it: "Is this safe? Is this allowed?"

### **Vulnerability**
A weakness in security that could be exploited by an attacker. Like an unlocked window in a house. Security teams actively look for and fix vulnerabilities.

---

## W

### **Whitelist / Blacklist**
A whitelist is a list of allowed things (allow these and reject everything else). A blacklist is a list of forbidden things (reject these and allow everything else). ATLAS-GATE-MCP might whitelist certain operations.

### **Workflow**
A series of steps to accomplish a task. "The approval workflow is: Developer requests → Manager approves → System executes."

---

## Z

### **Zero-Trust**
A security philosophy that assumes nothing is trustworthy by default. Every request must be verified. Don't trust that the AI is safe just because it's an AI—verify every action. ATLAS-GATE-MCP uses zero-trust principles.

---

## Common Acronyms

| Acronym | Full Name | Simple Explanation |
|---------|-----------|-------------------|
| **AI** | Artificial Intelligence | Smart computer programs |
| **API** | Application Programming Interface | How programs talk to each other |
| **GDPR** | General Data Protection Regulation | EU privacy law |
| **HIPAA** | Health Insurance Portability Act | US health privacy law |
| **ISO 27001** | Information Security Management | International security standard |
| **MCP** | Model Context Protocol | Language AI tools use |
| **OAuth** | Open Authorization | Secure login standard |
| **RBAC** | Role-Based Access Control | Permission system based on roles |
| **SOC 2** | Service Organization Control 2 | Security audit certification |
| **TLS/SSL** | Transport Layer Security | Encrypts internet connections |

---

## When You See Jargon

If you encounter a term not in this glossary:

1. **Search this glossary** (Ctrl+F or Cmd+F)
2. **Check [START_HERE.md](../START_HERE.md)** for basic concepts
3. **Look in the relevant documentation** (likely explained there)
4. **Ask in [Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP/discussions)** — we're happy to explain

---

**Version**: 2.0.0  
**Last Updated**: February 2026  
**Audience**: Non-technical readers, decision-makers, business stakeholders
