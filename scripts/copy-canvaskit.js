import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../node_modules/canvaskit-wasm/bin');
const targetDir = path.resolve(__dirname, '../public/canvaskit');

// Ensure target directory exists
fs.ensureDirSync(targetDir);

// Copy canvaskit files
fs.copySync(sourceDir, targetDir, {
  filter: (src) => {
    const filename = path.basename(src);
    return filename === 'canvaskit.wasm' || filename === 'canvaskit.js';
  }
});

console.log('CanvasKit files copied successfully!');
