# MCP Maturity Scoring Specification v1.0

**ROLE**: INFRASTRUCTURE  
**AUTHORITY**: ATLAS-GATE MCP Governance  
**EFFECTIVE DATE**: January 19, 2026

---

## 1. Overview

The MCP Maturity Scoring Engine is a **read-only, evidence-based system** that computes organizational maturity across six canonical dimensions. Scores are **deterministic, non-negotiable, and fail-closed**.

### Core Principles

- **Evidence-Driven**: All scores bind to audit logs, policy results, intent validation, plan linter, replay findings, and remediation data
- **Deterministic**: Same input → same output, always
- **Fail-Closed**: Missing evidence caps dimensions at Level 2; Level-5 claims require all gates pass
- **Non-Negotiable**: Hard caps apply for violations; no heuristic overrides
- **Non-Coder Readable**: Reports use plain English, not metrics jargon

---

## 2. Maturity Model

### 2.1 Dimensions (6)

| Dimension | Definition |
|-----------|-----------|
| **Reliability** | System executes predictably; errors caught; audit coverage complete |
| **Security** | Policy enforcement 100%; no bypasses; governance locked |
| **Documentation** | Intent artifacts complete; schema valid; human-readable |
| **Governance** | 100% executions tied to approved plans; path authorization enforced |
| **Integration** | Tools automated; verification gates pass; configuration deterministic |
| **Performance** | Policy/audit overhead bounded; no regressions |

### 2.2 Levels

Scoring range: **1.0 to 5.0** (integer + decimal allowed internally; Level claims round down)

- **Level 5**: All gates pass; optimal maturity
- **Level 4**: Minor gaps; strong foundation
- **Level 3**: Moderate gaps; partial compliance
- **Level 2**: Significant gaps; fail-closed minimum
- **Level 1**: Critical failures; unsafe

### 2.3 Overall Score Rule

**Overall = min(dimension scores)**

The system is only as mature as its weakest dimension. There are no exceptions.

---

## 3. Evidence Sources (Mandatory)

Scoring consumes ONLY these sources:

| Source | File | Purpose |
|--------|------|---------|
| **P03: Audit Log** | `audit-log.jsonl` | Volume, failure rate, tamper checks, coverage |
| **P02: Error Envelope** | Embedded in audit | Coded failures, invariant density |
| **P04: Write Policy** | Policy engine results | Pass/fail rates, rule coverage |
| **P05: Intent Validation** | Intent validator output | Coverage %, drift incidents |
| **P06: Plan Linter & Approval** | Plan registry | Lint pass rate, enforceability |
| **P07: Replay/Forensics** | Replay engine results | Determinism verdicts, divergence |
| **P08: Remediation** | Proposal store | Backlog, approval latency |

**FAIL-CLOSED RULE**: If any source is missing → affected dimensions cap at Level 2.

---

## 4. Dimension Scoring Rules (Non-Negotiable)

### 4.1 Reliability

**Evidence Gates:**
- ≥99% tool invocations audited (coverage)
- 0 uncaught exceptions (error codes)
- Replay PASS rate ≥99%
- Mean time to diagnose ≤ threshold (audit→proposal latency)

**Level Caps:**
- Any tamper or divergence detected → max 3.0
- Any replay FAIL unresolved → max 4.0
- Hash chain break → max 3.0

**Formula:**
```
score = 5.0
if auditCoverage < 0.99: score = min(score, 3.5)
if uncaughtCount > 0: score = min(score, 2.0)
if hashChainBreaks > 0: score = 3.0
if replayFailRate > 0.01: score = min(score, 4.0)
return score
```

### 4.2 Security

**Evidence Gates:**
- 100% writes pass policy validation (P04)
- 0 policy bypasses
- Audit chain integrity PASS
- Human gate enforced for remediation (P08)

**Level Caps:**
- Any policy bypass → max 3.0
- Any audit tamper → max 2.0

**Formula:**
```
score = 5.0
if policyPassRate < 1.0: score = min(score, 3.0)
if bypassCount > 0: score = 3.0
if auditTamperedCount > 0: score = 2.0
return score
```

### 4.3 Documentation

**Evidence Gates:**
- Intent coverage ≥95% of written files (P05)
- 0 intent schema violations
- Non-coder sections present in intent schema

**Level Caps:**
- Unresolved drift → max 3.5

**Formula:**
```
score = 5.0
if intentCoverage < 0.95: score = min(score, 3.5 - (gap * 2.0))
if schemaViolations > 0: score = min(score, 3.0)
if !nonCoderSections: score = min(score, 2.0)
return score
```

### 4.4 Governance

**Evidence Gates:**
- 100% executions tied to approved plan hash (P06)
- 0 executions with hash mismatch
- All writes path-authorized

**Level Caps:**
- Any execution without approval → max 2.0

**Formula:**
```
score = 5.0
if planHashCoverage < 1.0: score = 2.0
if hashMismatches > 0: score = 2.0
if unauthorizedPaths > 0: score = 2.0
return score
```

### 4.5 Integration

**Evidence Gates:**
- Tool ecosystem coverage (≥5 tools)
- Automated verification gates passing
- Deterministic configuration detected

**Level Caps:**
- Manual steps required → max 4.0

**Formula:**
```
score = 5.0
if toolCount === 0: score = 2.0
else if toolCount < 5: score = 3.0
if gateFailures > 0: score = min(score, 3.5)
if manualStepsRequired: score = min(score, 4.0)
return score
```

### 4.6 Performance

**Evidence Gates:**
- Policy + lint overhead measured and bounded
- Replay + audit verify time bounded
- No performance regressions beyond threshold

**Level Caps:**
- Missing metrics → max 3.0

**Formula:**
```
score = 5.0
if !metrics.policyLatency or !metrics.auditLatency: score = 3.0
if policyLatency > 5000: score = min(score, 3.0)
if auditLatency > 10000: score = min(score, 3.5)
if regressionDetected: score = min(score, 2.5)
return score
```

---

## 5. Scoring Algorithm (Deterministic)

### Step 1: Parse Evidence
- Read audit log (JSONL)
- Extract policy results, intent coverage, plan approvals, replay verdicts, remediation status

### Step 2: Compute Raw Metrics
```
auditMetrics = {
  totalEntries: count(audit),
  failureRate: failures / totalEntries,
  hashChainBreaks: count(prevHash mismatch),
  ...
}
```

### Step 3: Compute Dimension Scores
For each dimension D:
```
scoreD = scoreD_Function(auditMetrics, policyMetrics, ...)
roundedScoreD = floor(scoreD * 10) / 10
```

### Step 4: Compute Overall
```
overallScore = min(score_Reliability, score_Security, ...)
roundedOverall = floor(overallScore * 10) / 10
```

### Step 5: Identify Blocking Reasons
```
blockingReasons = []
for each dimension:
  if score < 5.0:
    blockingReasons.push({
      dimension,
      score,
      blockedBy: (gap > 2.0) ? 'MAJOR_VIOLATION' : 'UNMET_EVIDENCE'
    })
```

### Step 6: Output Result
```
{
  timestamp: ISO,
  overall: number,
  dimensions: { [name]: score },
  evidence: { auditMetrics, policyMetrics, ... },
  blockingReasons: Array<{dimension, score, blockedBy}>
}
```

---

## 6. Fail-Closed Claims (Critical)

The system MUST:

1. **Refuse Level-5 Claims** unless all gates pass
2. **Explicitly State** the highest provable level
3. **Never Claim** "near Level-5"
4. **Document** each gap with evidence reference

### Level-5 Requirements (All Must Pass)

| Dimension | Requirement |
|-----------|-------------|
| Reliability | auditCoverage ≥99% AND hashChainBreaks=0 AND replayFailRate<0.01 |
| Security | policyPassRate=100% AND bypassCount=0 AND auditTamperedCount=0 |
| Documentation | intentCoverage≥95% AND schemaViolations=0 AND nonCoderSections=true |
| Governance | planHashCoverage=100% AND hashMismatches=0 AND unauthorizedPaths=0 |
| Integration | toolCount≥5 AND gateFailures=0 AND !manualStepsRequired |
| Performance | metrics present AND policyLatency≤5000 AND auditLatency≤10000 AND !regression |

If **any** requirement is unmet → Level-5 claim **blocked**.

---

## 7. Read-Only Tools (API)

### Tool 1: compute_maturity_score

**Input:**
```json
{
  "workspace_root": "/path/to/repo",
  "time_window": { "start": "2026-01-01", "end": "2026-01-31" }
}
```

**Output:**
```json
{
  "timestamp": "2026-01-19T...",
  "overall": 4.2,
  "dimensions": {
    "Reliability": 4.0,
    "Security": 5.0,
    "Documentation": 3.5,
    "Governance": 4.0,
    "Integration": 4.5,
    "Performance": 4.0
  },
  "evidence_summary": "...",
  "blocking_reasons": [
    {
      "dimension": "Documentation",
      "score": 3.5,
      "blockedBy": "UNMET_EVIDENCE"
    }
  ],
  "result_hash": "abc123..."
}
```

**Side Effects:**
- Appends audit entry (intent: read, tool: compute_maturity_score)
- No state mutations

---

### Tool 2: explain_maturity_gap

**Input:**
```json
{
  "workspace_root": "/path/to/repo",
  "target_level": 5.0,
  "current_result": { ... }
}
```

**Output:**
```json
{
  "current_level": 4.2,
  "target_level": 5.0,
  "can_reach_target": true,
  "gaps": [
    {
      "dimension": "Documentation",
      "current": 3.5,
      "target": 5.0,
      "gap": 1.5,
      "priority": "HIGH"
    }
  ],
  "unmet_invariants": [
    "Documentation: INCOMPLETE - Current 3.5 vs target 5.0"
  ],
  "required_evidence": [
    "Intent artifacts for ≥95% of files",
    "Zero intent schema violations"
  ]
}
```

---

## 8. Report Generation

Generated reports (Markdown):

- Executive summary (plain English)
- Radar table (dimensions × scores)
- "Why not Level-5" section
- Evidence checklist
- Detailed findings
- Recommendations (action-oriented)
- Trend vs. prior report

**Format:**
```
# MCP Maturity Assessment Report

## Executive Summary
Overall Maturity Level: X.X / 5.0

## Dimension Scores
| Dimension | Score | Status |
...

## Why Not Level 5?
...

## Evidence Checklist
...
```

---

## 9. Audit Integration

Every scoring run:

1. **Append Audit Entry:**
   - session_id: maturity-scoring
   - role: BOUNDARY
   - tool: compute_maturity_score
   - claimed_level: overall
   - result_hash: hash of score
   - timestamp: ISO

2. **Result Hash:**
   - SHA256(JSON.stringify(scoreResult, null, 0))
   - Enables audit trail verification

---

## 10. Non-Coder Explanation

### For Business Stakeholders

> The MCP server's maturity score of 4.2/5.0 indicates a **mature, well-governed system**. 
> The main gap is in Documentation (3.5), where 15% of changes lack written intent explanations.
> Security and Governance are excellent (5.0 and 4.0). Improving documentation coverage to 95% 
> would close the gap and reach Level 5.

### For Engineers

> Missing evidence: intent coverage 80% (need 95%), causing Documentation cap at 3.5.
> Action: Ensure all file writes include .intent.md artifacts. Required evidence: 
> INTENT_COVERAGE ≥95%, INTENT_SCHEMA_VIOLATIONS=0, NON_CODER_SECTIONS=true.

---

## 11. Examples (Structure Only)

### Example 1: Perfect System (Level 5.0)
```json
{
  "overall": 5.0,
  "dimensions": {
    "Reliability": 5.0,
    "Security": 5.0,
    "Documentation": 5.0,
    "Governance": 5.0,
    "Integration": 5.0,
    "Performance": 5.0
  },
  "blockingReasons": []
}
```

### Example 2: Degraded Security (Level 3.0)
```json
{
  "overall": 3.0,
  "dimensions": {
    "Reliability": 4.5,
    "Security": 3.0,  // Policy bypass detected
    "Documentation": 4.0,
    "Governance": 4.5,
    "Integration": 4.2,
    "Performance": 4.0
  },
  "blockingReasons": [
    {
      "dimension": "Security",
      "score": 3.0,
      "blockedBy": "MAJOR_VIOLATION"
    }
  ]
}
```

---

## 12. Verification & Testing

### Mandatory Test Coverage (≥14 tests)

1. Missing evidence caps dimensions → Level 2
2. Policy bypass → Security ≤3.0
3. Hash chain break → Reliability ≤3.0
4. Intent drift → Documentation ≤3.5
5. No approved plan → Governance ≤2.0
6. Manual integration → Integration ≤4.0
7. Missing metrics → Performance ≤3.0
8. Overall = min(dimensions)
9. Determinism (same input = same output)
10. explain_maturity_gap accuracy
11. Report generation
12. Audit entry appended
13. Level-5 claim fail-closed
14. Trend delta correctness

---

## 13. Known Limitations

1. **Time Window Filtering**: Not yet implemented; full audit log is scored
2. **Performance Metrics**: Currently stubbed; requires instrumentation
3. **Replay Results**: Currently stubbed; requires replay engine integration
4. **Intent Coverage**: Estimated from audit; requires explicit intent tracking
5. **Multi-Language Support**: Rust gates hardened; other languages in progress

---

## 14. Future Enhancements

- [ ] Real-time scoring dashboard
- [ ] Trend analysis (moving averages)
- [ ] Dimension-specific remediation planner
- [ ] Automated fixes for Level-2 gaps
- [ ] Multi-repo scoring aggregation

---

## Appendix: Error Codes

| Code | Meaning |
|------|---------|
| MATURITY_EVIDENCE_INSUFFICIENT | Required evidence missing |
| MATURITY_CLAIM_EXCEEDS_PROOF | Claimed level > provable level |
| MATURITY_GAP_UNMET | Blocking reason identified |

---

**Document Version**: 1.0  
**Last Updated**: January 19, 2026  
**Owner**: ATLAS-GATE MCP Governance
