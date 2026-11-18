const fs = require('node:fs');
const path = require('node:path');

const files = [
  'node_modules/@jannchie/pixi-live2d-display/dist/cubism4.es.js',
  'node_modules/@jannchie/pixi-live2d-display/dist/cubism4.js',
];

const deprecatedOption = 'loadParser: "loadTextures"';
const supportedOption = 'parser: "loadTextures"';

for (const file of files) {
  const filePath = path.resolve(file);
  const source = fs.readFileSync(filePath, 'utf8');
  const occurrences = source.split(deprecatedOption).length - 1;

  if (occurrences === 0 && source.includes(supportedOption)) continue;
  if (occurrences !== 1) {
    throw new Error(`Expected one deprecated Pixi parser option in ${file}`);
  }

  fs.writeFileSync(filePath, source.replace(deprecatedOption, supportedOption));
}
