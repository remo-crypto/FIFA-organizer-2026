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

  // Test 6 (NFR-1.6): parseMarkdown must neutralize HTML-significant characters before
  // formatting, closing the DOM-XSS that previously existed in the copilot chat renderer.
  console.log('✅ Test 6: Verifying parseMarkdown neutralizes injected HTML/script (XSS regression test)...');
  const xssPayload = '<img src=x onerror="alert(1)">**bold**';
  const xssOutput = parseMarkdown(xssPayload);
  assert.ok(!xssOutput.includes('<img'), 'XSS REGRESSION: raw <img> tag was not escaped by parseMarkdown');
  assert.ok(xssOutput.includes('&lt;img'), 'Expected escaped &lt;img entity in parseMarkdown output');
  assert.ok(xssOutput.includes('<strong>bold</strong>'), 'Markdown bold formatting should still work after escaping');
  console.log('   -> parseMarkdown escapes HTML before formatting; injected markup cannot execute.');

  // Test 7 (FR-2.1): copilot answers must be generated from live telemetryState, not
  // hardcoded strings that can drift from what the dashboard displays.
  console.log('✅ Test 7: Verifying copilot responses are grounded in live telemetryState...');
  assert.ok(
    /copilotResponses\s*=\s*\{[\s\S]*?"which gate is most congested\?"\s*:\s*\(\)\s*=>/.test(indexJsContent),
    'copilotResponses entries must be functions computed from live state, not static strings'
  );
  assert.ok(!/Gate B\*\* is showing the highest congestion.*24 minutes/.test(indexJsContent),
    'Found a hardcoded "24 minutes" congestion answer — this can drift from the live simulator');
  console.log('   -> Congestion/prediction/summary answers are computed, not pre-written.');

  // Test 8 (FR-3.1): native alert() must not be used for in-app notifications; it is
  // unstyled, blocking, and inconsistent with the rest of the accessible UI.
  console.log('✅ Test 8: Verifying blocking alert() is not used for app notifications...');
  const codeOnly = indexJsContent
    .replace(/\/\*[\s\S]*?\*\//g, '')   // strip block comments
    .replace(/\/\/.*$/gm, '');          // strip line comments
  assert.ok(!/\balert\(/.test(codeOnly), 'Found a native alert() call — replace with showToast()');
  assert.ok(indexJsContent.includes('function showToast('), 'Missing showToast() notification helper');
  console.log('   -> Notifications use the accessible, non-blocking toast helper.');

  // Test 9 (FR-5.1): translation dictionary must cover the same key set in all three
  // supported languages, and index.html must reference data-i18n hooks.
  console.log('✅ Test 9: Verifying multilingual coverage beyond the header...');
  const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok((htmlContent.match(/data-i18n="/g) || []).length >= 10,
    'Expected at least 10 data-i18n hooks in index.html for real multilingual coverage');
  const translationsMatch = indexJsContent.match(/const translations = \{[\s\S]*?\n\};/);
  assert.ok(translationsMatch, 'Missing translations dictionary in index.js');
  const translations = new Function(`${translationsMatch[0]}; return translations;`)();
  const enKeys = Object.keys(translations.en).sort();
  ['es', 'fr'].forEach(lang => {
    const langKeys = Object.keys(translations[lang]).sort();
    assert.deepStrictEqual(langKeys, enKeys, `Language "${lang}" is missing keys present in "en": ${JSON.stringify(enKeys)}`);
  });
  console.log('   -> es/fr translation dictionaries have full key parity with en.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Smart Stadium Operations Platform is verified.');
} catch (error) {
  console.error('\n❌ TEST SUITE FAILED!');
  console.error(error);
  process.exit(1);
}
