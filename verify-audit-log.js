#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verifyAuditLog() {
  console.log('📋 Verifying audit log integrity...');

  const auditLogPath = path.join(__dirname, 'audit-log.jsonl');

  try {
    if (!fs.existsSync(auditLogPath)) {
      console.log('ℹ️ Audit log not found (may be first run)');
      return;
    }

    const content = fs.readFileSync(auditLogPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    let validLines = 0;
    let errors = 0;

    lines.forEach((line, idx) => {
      try {
        JSON.parse(line);
        validLines++;
      } catch (err) {
        console.error(`❌ Invalid JSON at line ${idx + 1}: ${line.substring(0, 50)}...`);
        errors++;
      }
    });

    console.log(`✅ Audit log contains ${validLines} valid entries`);

    if (errors > 0) {
      console.error(`❌ Found ${errors} invalid entries in audit log`);
      process.exit(1);
    }
  } catch (err) {
    console.error('[AUDIT_VERIFY] Error reading audit log:', err.message);
    process.exit(1);
  }
}

verifyAuditLog().catch((err) => {
  console.error('[AUDIT_VERIFY] Unexpected error:', err.message);
  process.exit(1);
});
