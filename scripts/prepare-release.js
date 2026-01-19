#!/usr/bin/env node

/**
 * Release Preparation Script
 * 
 * Prepares repository for release by:
 * - Validating documentation builds from source
 * - Ensuring no build artifacts are committed
 * - Verifying source-of-truth discipline
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReleasePreparer {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async prepare() {
    console.log('🚀 Preparing release...');
    
    this.validateCleanWorkingDirectory();
    this.validateDocumentationBuild();
    this.validateNoBuildArtifacts();
    this.validateSourceTruth();
    
    this.reportResults();
    return this.errors.length === 0;
  }

  validateCleanWorkingDirectory() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        this.errors.push('Working directory not clean. Commit or stash changes first.');
      }
    } catch (error) {
      this.errors.push('Failed to check git status');
    }
  }

  validateDocumentationBuild() {
    try {
      console.log('📚 Building documentation from source...');
      execSync('npm run docs:build', { stdio: 'inherit' });
      console.log('✅ Documentation build successful');
    } catch (error) {
      this.errors.push('Documentation build failed');
    }
  }

  validateNoBuildArtifacts() {
    const ignoredPaths = [
      'docs/build',
      'docs/dist', 
      'docs/site',
      'docs/public',
      'docs/out',
      'docs/.cache',
      'docs/_site',
      'docs/_build'
    ];

    ignoredPaths.forEach(ignoredPath => {
      const fullPath = path.join(__dirname, '..', ignoredPath);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        if (files.length > 0) {
          this.errors.push(`Build artifacts found in ${ignoredPath} - should be ignored`);
        }
      }
    });
  }

  validateSourceTruth() {
    // Check that rendered diagrams exist but are properly ignored
    const renderedDir = path.join(__dirname, '..', 'docs', 'diagrams', 'rendered');
    if (fs.existsSync(renderedDir)) {
      const files = fs.readdirSync(renderedDir);
      if (files.length === 0) {
        this.warnings.push('No rendered diagrams found - run docs:build first');
      }
    }
  }

  reportResults() {
    console.log('\n📊 Release Preparation Results:');
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length === 0) {
      console.log('✅ Release preparation completed successfully');
    }
  }
}

// Execute release preparation
const preparer = new ReleasePreparer();
const isReady = await preparer.prepare();

process.exit(isReady ? 0 : 1);
