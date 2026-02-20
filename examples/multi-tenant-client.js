#!/usr/bin/env node

/**
 * Multi-Tenant Client Example
 * 
 * Demonstrates connecting to ATLAS-GATE HTTP server and performing
 * operations across multiple repositories
 * 
 * Usage:
 *   node examples/multi-tenant-client.js
 */

import { AtlasGateClient } from '../api/client-sdk.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    // Initialize client
    const client = new AtlasGateClient({
      baseUrl: process.env.ATLAS_GATE_URL || 'http://localhost:3000',
      apiKey: process.env.ATLAS_GATE_API_KEY || 'your-api-key-here'
    });

    console.log('[CLIENT] Connecting to ATLAS-GATE...');

    // Check server health
    const health = await client.health();
    console.log('[OK] Server healthy:', health.status);
    console.log('    Version:', health.version);
    console.log('    Tenants:', health.tenantCount);
    console.log('');

    // Create a session
    console.log('[SESSION] Creating workspace session...');
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const session = await client.createSession({
      workspaceRoot: projectRoot,
      role: 'WINDSURF',
      metadata: { client: 'example-script' }
    });
    console.log('[OK] Session created:', session.id);
    console.log('    Workspace:', session.workspaceRoot);
    console.log('    Role:', session.role);
    console.log('');

    // Example 1: Read a file
    console.log('[TOOL] Reading package.json...');
    try {
      const pkg = await client.readFile('package.json');
      const pkgData = JSON.parse(pkg.content);
      console.log('[OK] Package loaded:', pkgData.name, 'v' + pkgData.version);
    } catch (err) {
      console.log('[SKIP] package.json not found (expected if not in root)');
    }
    console.log('');

    // Example 2: List plans
    console.log('[TOOL] Listing plans...');
    const plans = await client.listPlans();
    console.log('[OK] Found plans:', plans.length);
    if (plans.length > 0) {
      plans.slice(0, 3).forEach(p => {
        console.log('    -', p.name || p.path);
      });
    }
    console.log('');

    // Example 3: Dynamic workspace switching
    console.log('[WORKSPACE] Switching workspace...');
    const altPath = path.join(projectRoot, '..');
    try {
      await client.updateSessionWorkspace(altPath);
      console.log('[OK] Switched to:', altPath);
    } catch (err) {
      console.log('[SKIP] Alternative path not accessible');
    }
    console.log('');

    // Example 4: Read audit log
    console.log('[AUDIT] Reading audit log...');
    const logs = await client.readAuditLog();
    console.log('[OK] Audit entries:', logs.length);
    logs.slice(0, 3).forEach(entry => {
      const status = entry.result === 'ok' ? '✓' : '✗';
      console.log(`    ${status} ${entry.tool} (${entry.timestamp})`);
    });
    console.log('');

    // Example 5: List all sessions
    console.log('[SESSIONS] Listing all sessions...');
    const sessions = await client.listSessions();
    console.log('[OK] Active sessions:', sessions.length);
    sessions.slice(0, 3).forEach(s => {
      const age = Math.floor((Date.now() - new Date(s.created).getTime()) / 1000);
      console.log(`    - ${s.id.slice(0, 8)}... (role: ${s.role}, age: ${age}s)`);
    });
    console.log('');

    console.log('[SUCCESS] All examples completed!');

  } catch (err) {
    console.error('[ERROR]', err.message);
    if (err.stack && process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
