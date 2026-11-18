const fs = require('node:fs');
const path = require('node:path');

const distPath = path.resolve('node_modules/@jannchie/pixi-live2d-display/dist');
const cubism4Files = [
  'node_modules/@jannchie/pixi-live2d-display/dist/cubism4.es.js',
  'node_modules/@jannchie/pixi-live2d-display/dist/cubism4.js',
];

const deprecatedOption =
  /(?:\bloadParser\b|["']loadParser["'])\s*:\s*["']loadTextures["']/g;
const supportedOption = 'parser: "loadTextures"';
const maskClear =
  /^([ \t]*)this\.gl\.clearColor\(1, 1, 1, 0\);\n\1this\.gl\.clear\(this\.gl\.COLOR_BUFFER_BIT\);(?:\n\1this\.gl\.clearColor\(0, 0, 0, 0\);)*/gm;
const restoredMaskClear = 'this.gl.clearColor(0, 0, 0, 0);';

const distributionFiles = fs
  .readdirSync(distPath)
  .filter((file) => file.endsWith('.js'))
  .map((file) => path.join(distPath, file));

if (distributionFiles.length === 0) {
  throw new Error(`No JavaScript distribution files found in ${distPath}`);
}

for (const filePath of distributionFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  const patchedSource = source.replace(deprecatedOption, supportedOption);

  if (patchedSource.includes('loadParser')) {
    throw new Error(`Unpatched deprecated parser reference in ${filePath}`);
  }

  if (patchedSource !== source) {
    fs.writeFileSync(filePath, patchedSource);
  }
}

for (const file of cubism4Files) {
  const filePath = path.resolve(file);
  let source = fs.readFileSync(filePath, 'utf8');
  const maskClearCount = [...source.matchAll(maskClear)].length;

  if (maskClearCount !== 2) {
    throw new Error(`Expected two Cubism mask clear operations in ${file}`);
  }

  // Cubism changes GL state directly; restore Pixi's transparent clear color after mask clears.
  source = source.replace(
    maskClear,
    (_match, indent) =>
      `${indent}this.gl.clearColor(1, 1, 1, 0);\n` +
      `${indent}this.gl.clear(this.gl.COLOR_BUFFER_BIT);\n` +
      `${indent}${restoredMaskClear}`,
  );

  fs.writeFileSync(filePath, source);
}
