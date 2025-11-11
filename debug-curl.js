// Debug the looksLikeCurl function
function looksLikeCurl(text) {
  if (!text) return false;
  console.log('Input text:', JSON.stringify(text));
  console.log('Starts with curl?:', /^curl\s+/i.test(text));
  
  // Must start with "curl " (not just "curl") at the very beginning
  if (!/^curl\s+/i.test(text)) {
    console.log('Does not start with curl');
    return false;
  }
  
  const trimmed = text.trim();
  console.log('Trimmed:', JSON.stringify(trimmed));
  // Remove the "curl " part to check what's after it
  const afterCurl = trimmed.replace(/^curl\s+/i, '');
  console.log('After curl:', JSON.stringify(afterCurl));
  
  // Must have something after "curl "
  if (!afterCurl) {
    console.log('Nothing after curl');
    return false;
  }
  
  // Check patterns
  const patterns = [
    { name: '^-X\\s', pattern: /^-X\s/ },
    { name: '^-[A-Za-z]+', pattern: /^-[A-Za-z]+/ },
    { name: '^\\S', pattern: /^\S/ }
  ];
  
  for (const {name, pattern} of patterns) {
    const matches = pattern.test(afterCurl);
    console.log(`${name} matches "${afterCurl}":`, matches);
  }
  
  return true;
}

// Test cases
console.log('=== Test 1: curl https://example.com ===');
looksLikeCurl("curl https://example.com");

console.log('\n=== Test 2:   curl -X GET https://example.com ===');
looksLikeCurl("  curl -X GET https://example.com");

console.log('\n=== Test 3: CURL https://example.com ===');
looksLikeCurl("CURL https://example.com");

console.log('\n=== Test 4: curl -v https://example.com ===');
looksLikeCurl("curl -v https://example.com");

console.log('\n=== Test 5: \\ncurl https://example.com ===');
looksLikeCurl("\ncurl https://example.com");