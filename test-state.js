/**
 * Automated Verification Script - Smart Stadium Operations Platform
 * Verifies code configurations, markdown parser logic, copilot templates, and file integrity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Smart Stadium Operations Platform Test Suite...');

// Mock DOM elements to load browser script elements
global.window = {
  addEventListener: () => {},
  speechSynthesis: {
    cancel: () => {},
    speak: () => {}
  }
};
global.document = {
  addEventListener: () => {},
  getElementById: (id) => {
    return {
      textContent: '',
      innerHTML: '',
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {}
      },
      appendChild: () => {},
      focus: () => {}
    };
  },
  querySelectorAll: () => []
};

// Import code elements by reading files to verify syntax & logic
try {
  const indexJsContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

  // Test 1: File Integrity check
  console.log('✅ Test 1: Verifying project file directory structure...');
  const filesToCheck = [
    'index.html',
    'index.css',
    'index.js',
    'docs/architecture.md',
    'docs/database_schema.md',
    'docs/api_documentation.md',
    'docs/ui_ux_wireframes_journeys.md',
    'docs/implementation_roadmap_mvp.md',
    'docs/governance_security.md'
  ];
  
  filesToCheck.forEach(file => {
    assert.ok(fs.existsSync(path.join(__dirname, file)), `File missing: ${file}`);
  });
  console.log('   -> All 9 core code & documentation files exist.');

  // Test 2: Evaluate markdown parser logic from index.js
  console.log('✅ Test 2: Testing Markdown parser function logic...');
  
  // Extract parseMarkdown function from string
  const parseMarkdownMatch = indexJsContent.match(/function parseMarkdown[\s\S]*?return[\s\S]*?;\s*}/);
  if (!parseMarkdownMatch) {
    throw new Error('Could not extract parseMarkdown function from index.js');
  }
  
  // Evaluate the extracted function safely
  const parseMarkdown = new Function('text', `${parseMarkdownMatch[0]}; return parseMarkdown(text);`);
  
  const testInput = "### EMERGENCY SOP\nRun the **evacuation** immediately.";
  const expectedOutput = "<h4>EMERGENCY SOP</h4>Run the <strong>evacuation</strong> immediately.";
  const actualOutput = parseMarkdown(testInput);
  
  assert.strictEqual(actualOutput, expectedOutput, `Markdown parsing failed: Got "${actualOutput}"`);
  console.log('   -> parseMarkdown output is correct (headers, bolding, line breaks).');

  // Test 3: Evaluate chatbot matching keys from index.js
  console.log('✅ Test 3: Testing AI Copilot query matching templates...');
  
  // Check presence of key query response triggers in index.js
  const expectedQueries = [
    "which gate is most congested?",
    "predict crowd density for the next hour.",
    "generate an evacuation plan.",
    "summarize today's operational issues."
  ];

  expectedQueries.forEach(query => {
    assert.ok(indexJsContent.toLowerCase().includes(query), `Missing response template for query: "${query}"`);
  });
  console.log('   -> AI Copilot holds correct operational template matching rules.');

  // Test 4: Validate database schemas (docs/database_schema.md)
  console.log('✅ Test 4: Validating SQL schema configuration scripts...');
  const schemaContent = fs.readFileSync(path.join(__dirname, 'docs/database_schema.md'), 'utf8');
  assert.ok(schemaContent.includes('CREATE TABLE users'), 'Missing PostgreSQL users table definition');
  assert.ok(schemaContent.includes('CREATE TABLE crowd_telemetry'), 'Missing TimescaleDB telemetry table definition');
  assert.ok(schemaContent.includes('create_hypertable'), 'Missing TimescaleDB hypertable partition instructions');
  console.log('   -> TimescaleDB and PostgreSQL database schemas verified.');

  // Test 5: Verify global accessibility parameters
  console.log('✅ Test 5: Verifying accessibility contrast variables...');
  const cssContent = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
  assert.ok(cssContent.includes('body.contrast-mode'), 'Missing high contrast variable definitions in index.css');
  assert.ok(cssContent.includes('--bg-primary: #000000'), 'Contrast mode is not using compliant true black (#000000) base');
  console.log('   -> CSS Contrast mode variables compliant with visual accessibility standard.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Smart Stadium Operations Platform is verified.');
} catch (error) {
  console.error('\n❌ TEST SUITE FAILED!');
  console.error(error);
  process.exit(1);
}
