const fs = require('node:fs');
const path = require('node:path');

const files = [
  'node_modules/@jannchie/pixi-live2d-display/dist/cubism4.es.js',
  'node_modules/@jannchie/pixi-live2d-display/dist/cubism4.js',
];

const deprecatedOption = 'loadParser: "loadTextures"';
const supportedOption = 'parser: "loadTextures"';
const legacyMaskClear =
  /^([ \t]*)this\.gl\.clearColor\(1, 1, 1, 0\);\n\1this\.gl\.clear\(this\.gl\.COLOR_BUFFER_BIT\);/gm;
const restoredMaskClear = 'this.gl.clearColor(0, 0, 0, 0);';

for (const file of files) {
  const filePath = path.resolve(file);
  let source = fs.readFileSync(filePath, 'utf8');
  const occurrences = source.split(deprecatedOption).length - 1;

  if (occurrences === 1) {
    source = source.replace(deprecatedOption, supportedOption);
  } else if (occurrences !== 0 || !source.includes(supportedOption)) {
    throw new Error(`Expected one deprecated Pixi parser option in ${file}`);
  }

  const maskClearCount = [...source.matchAll(legacyMaskClear)].length;
  const restoredMaskClearCount = source.split(restoredMaskClear).length - 1;

  if (maskClearCount === 2) {
    // Cubism changes GL state directly; restore Pixi's transparent clear color after mask clears.
    source = source.replace(
      legacyMaskClear,
      (_match, indent) =>
        `${indent}this.gl.clearColor(1, 1, 1, 0);\n` +
        `${indent}this.gl.clear(this.gl.COLOR_BUFFER_BIT);\n` +
        `${indent}${restoredMaskClear}`,
    );
  } else if (maskClearCount !== 0 || restoredMaskClearCount !== 2) {
    throw new Error(`Expected two Cubism mask clear operations in ${file}`);
  }

  fs.writeFileSync(filePath, source);
}
