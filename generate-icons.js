// Generate PWA PNG icons from the SVG
// Run: node generate-icons.js

import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('public/icon.svg');

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`Created icon-${size}.png`);
}

console.log('PWA icons generated successfully.');
