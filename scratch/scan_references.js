const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') scanDir(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('matchQuestionsFromBank') || content.includes('topicMatcher')) {
        console.log('Found reference in:', full);
      }
    }
  }
}

scanDir(path.join(__dirname, '..', 'src'));
console.log('Scan complete.');
