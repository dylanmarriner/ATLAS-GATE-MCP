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

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      try {
        JSON.parse(line);
        validLines++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Invalid JSON at line ${idx + 1}: ${line.substring(0, 50)}...`);
        console.error(`   Error: ${errorMsg}`);
        errors++;
        throw new Error(`Invalid JSON at line ${idx + 1}: ${errorMsg}`);
      }
    }

    console.log(`✅ Audit log contains ${validLines} valid entries`);

    if (errors > 0) {
      console.error(`❌ Found ${errors} invalid entries in audit log`);
      throw new Error(`Audit log contains ${errors} invalid entries`);
    }
    } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[AUDIT_VERIFY] Error reading audit log:', errorMsg);
    throw new Error(`Failed to verify audit log: ${errorMsg}`);
    }
    }

verifyAuditLog().catch((err) => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error('[AUDIT_VERIFY] Unexpected error:', errorMsg);
  throw new Error(`Audit verification failed: ${errorMsg}`);
});
