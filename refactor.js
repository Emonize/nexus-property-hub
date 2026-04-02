const fs = require('fs');
const path = require('path');

const mapping = {
  '/api/dashboard/spaces': { actionName: 'getSpaces', file: '@/lib/actions/spaces' },
  '/api/dashboard/leases': { actionName: 'getLeases', file: '@/lib/actions/leases' },
  '/api/dashboard/tenants': { actionName: 'getTenants', file: '@/lib/actions/tenants' },
  '/api/dashboard/maintenance': { actionName: 'getTickets', file: '@/lib/actions/maintenance' },
  '/api/dashboard/payments': { actionName: 'getPayments', file: '@/lib/actions/payments' },
  '/api/dashboard/trust': { actionName: 'getTrustScores', file: '@/lib/actions/trust' },
  '/api/tenants': { actionName: 'getTenants', file: '@/lib/actions/tenants' }
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let importsToAdd = new Set();

  for (const [apiUrl, config] of Object.entries(mapping)) {
    if (content.includes(`fetch('${apiUrl}')`)) {
      importsToAdd.add(`import { ${config.actionName} } from '${config.file}';`);
      
      const asyncRegex = new RegExp(
        `const res\\s*=\\s*await fetch\\('${apiUrl.replace(/[/]/g, '\\\\/')}'\\);\\s*if\\s*\\(res\\.ok\\)\\s*\\{\\s*const data\\s*=\\s*await res\\.json\\(\\);`, 'g'
      );
      content = content.replace(asyncRegex, `const data = await ${config.actionName}();`);
      
      const thenRegex = new RegExp(
        `fetch\\('${apiUrl.replace(/[/]/g, '\\\\/')}'\\)\\s*\\.then\\([^)]+\\=>\\s*[^.]+\\.json\\(\\)\\)`, 'g'
      );
      content = content.replace(thenRegex, `${config.actionName}()`);
    }
  }

  if (content !== originalContent) {
    const importStatements = Array.from(importsToAdd).join('\n') + '\n';
    if (content.startsWith("'use client';")) {
      content = content.replace("'use client';\n", "'use client';\n\n" + importStatements);
    } else {
      content = importStatements + content;
    }
    fs.writeFileSync(filePath, content);
    console.log('Updated: ' + filePath);
  }
}

function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) scan(full);
    else if (full.endsWith('.tsx')) {
      processFile(full);
    }
  }
}

scan('./src/app/(dashboard)');
