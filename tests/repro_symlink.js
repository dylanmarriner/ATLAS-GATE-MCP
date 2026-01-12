import fs from 'fs';
import path from 'path';
import { initializePathResolver, resolveWriteTarget, getRepoRoot } from '../core/path-resolver.js';

// Setup directories
const tmpDir = path.resolve('./tests/temp_repro');
const realRepo = path.join(tmpDir, 'real_repo');
const symlinkRepo = path.join(tmpDir, 'symlink_repo');

// Cleanup
if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
}

// Create real repo
fs.mkdirSync(realRepo, { recursive: true });
fs.writeFileSync(path.join(realRepo, 'existing.txt'), 'hello');

// Create symlink
fs.symlinkSync(realRepo, symlinkRepo);

console.log('Setup complete.');
console.log('Real Repo:', realRepo);
console.log('Symlink Repo:', symlinkRepo);

// Initialize with SYMLINK path
// path-resolver should resolve this to REAL path internally
console.log('\nInitializing with symlink path...');
initializePathResolver(symlinkRepo);

const resolvedRoot = getRepoRoot();
console.log('Resolved Repo Root (should be real):', resolvedRoot);

// Try to write to a new file using the SYMLINK path
const targetFile = path.join(symlinkRepo, 'new_file.txt');
console.log('\nAttempting to resolve write target:', targetFile);

try {
    const result = resolveWriteTarget(targetFile);
    console.log('SUCCESS: Resolved to:', result);
} catch (error) {
    console.error('FAILURE:', error.message);
    process.exit(1);
}
