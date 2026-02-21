const { version } = require('../package.json');
const fs = require('fs');
const path = require('path');

const content = `export const APP_VERSION = '${version}';\n`;
fs.writeFileSync(path.join(__dirname, '../src/app/version.ts'), content);
console.log(`Version set to ${version}`);
