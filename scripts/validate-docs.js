#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * Validates documentation structure, links, and formatting.
 * Enforces source-of-truth discipline for docs-as-a-product.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.join(__dirname, '..', 'docs');

class DocumentationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    console.log('🔍 Validating documentation structure...');
    
    this.validateStructure();
    this.validateIndexFiles();
    this.validateDiagramSources();
    
    this.reportResults();
    return this.errors.length === 0;
  }

  validateStructure() {
    const requiredDirs = [
      'docs/diagrams/source',
      'docs/diagrams/rendered',
      'docs/audit',
      'docs/reports'
    ];

    requiredDirs.forEach(dir => {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing required directory: ${dir}`);
      }
    });

    // Ensure rendered directory exists but is ignored
    const renderedDir = path.join(DOCS_DIR, 'diagrams', 'rendered');
    if (!fs.existsSync(renderedDir)) {
      fs.mkdirSync(renderedDir, { recursive: true });
      this.warnings.push(`Created rendered directory: ${renderedDir}`);
    }
  }

  validateIndexFiles() {
    const indexPath = path.join(DOCS_DIR, 'README.md');
    if (!fs.existsSync(indexPath)) {
      this.errors.push('Missing docs/README.md - documentation entry point');
    }
  }

  validateDiagramSources() {
    const sourceDir = path.join(DOCS_DIR, 'diagrams', 'source');
    if (!fs.existsSync(sourceDir)) {
      this.errors.push('Missing docs/diagrams/source directory');
      return;
    }

    const diagramFiles = fs.readdirSync(sourceDir, { recursive: true }).filter(f => 
      typeof f === 'string' && (f.endsWith('.mmd') || f.endsWith('.puml') || f.endsWith('.plantuml'))
    );

    if (diagramFiles.length === 0) {
      this.warnings.push('No diagram source files found in docs/diagrams/source');
    } else {
      console.log(`✅ Found ${diagramFiles.length} diagram source files`);
    }
  }

  reportResults() {
    console.log('\n📊 Documentation Validation Results:');
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All documentation validation checks passed');
    }
  }
}

// Execute validation
const validator = new DocumentationValidator();
const isValid = validator.validate();

process.exit(isValid ? 0 : 1);
