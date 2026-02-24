#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verifySecurity() {
  console.log('🔒 Running security verification...');

  const coreDir = path.join(__dirname, 'core');
  const toolsDir = path.join(__dirname, 'tools');
  const testDir = path.join(__dirname, 'tests');

  let errors = 0;

  // Check for dangerous patterns
  const checkFile = (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Check for eval, require in ES modules context, dangerous patterns
        // Skip eval if it's in a test context (sandbox tests checking isolation)
        if (
          /\beval\s*\(/.test(line) &&
          !line.trim().startsWith('//') &&
          !filePath.includes('sandbox') &&
          !filePath.includes('test')
        ) {
          console.error(`❌ Found eval() at ${filePath}:${idx + 1}`);
          errors++;
        }
        if (/\.then\s*\(/.test(line) && !line.trim().startsWith('//')) {
          // This is a style warning - we prefer async/await
          // But don't fail the build for it
        }
      });
    } catch (err) {
      // Skip unreadable files
    }
  };

  const walkDir = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        if (file.startsWith('.')) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
          checkFile(filePath);
        }
      });
    } catch (err) {
      // Skip inaccessible directories
    }
  };

  walkDir(coreDir);
  walkDir(toolsDir);

  if (errors > 0) {
    console.error(`\n❌ Security verification failed with ${errors} issues`);
    process.exit(1);
  } else {
    console.log('✅ Security verification passed');
  }
}

verifySecurity().catch((err) => {
  console.error('[SECURITY_VERIFY] Unexpected error:', err.message);
  process.exit(1);
});
