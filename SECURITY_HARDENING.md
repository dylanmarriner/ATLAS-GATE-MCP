# ATLAS-GATE MCP - Security Hardening

## Overview

ATLAS-GATE uses **fail-closed enforcement** - if any check fails, the operation is rejected.

## Core Security Mechanisms

### 1. Write-Time Policy Enforcement

Every file write is blocked if it contains:

- TODO, FIXME, XXX, HACK markers
- mock*, fake*, dummy* patterns
- Empty functions {}
- Unsafe language constructs

### 2. Plan Validation (7 Stages)

All plans must pass:

1. Structure validation
2. Phase validation
3. Path validation
4. Enforceability validation
5. Auditability validation
6. Spectral linting (optional)
7. Signature verification

### 3. Cryptographic Signing

- Plans signed with cosign (ECDSA P-256 or SHA256)
- Audit entries individually signed
- Hash-chaining for tamper-evidence

### 4. Audit Logging

- Append-only (no overwrites)
- Signature chain validation
- Automatic corruption detection

## Configuration Security

- ✓ All secrets via environment variables
- ✓ No hardcoded credentials
- ✓ File permissions configurable
- ✓ Backup encryption supported

## Network Security

- ✓ TLS/mTLS configurable
- ✓ CORS headers configurable
- ✓ No exposed debugging
- ✓ No eval() or dynamic loading

---

**All systems fail-closed. No exceptions. No backdoors.**
