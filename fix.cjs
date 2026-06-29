const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

// Replace DEFAULT_PROFILES usages
code = code.replace(/,\s*DEFAULT_PROFILES/g, ', []');
code = code.replace(/<Profile>\('profiles', DEFAULT_PROFILES\)/g, "<Profile>('profiles', [])");

// Remove the definition of DEFAULT_PROFILES
const defStart = code.indexOf('const DEFAULT_PROFILES: Profile[] = [');
if (defStart !== -1) {
  const defEnd = code.indexOf('];', defStart) + 2;
  code = code.substring(0, defStart) + code.substring(defEnd);
}

fs.writeFileSync('src/lib/api.ts', code);
