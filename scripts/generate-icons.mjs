import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
const svgPath = resolve(publicDir, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

// All sizes needed for a robust PWA (Android, iOS, Windows, macOS)
const sizes = [
  // Standard PWA icons
  { size: 48, name: 'icon-48x48.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  // Apple touch icons
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  // Favicon
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
];

// Maskable icon (with padding for safe zone)
const maskableSizes = [
  { size: 192, name: 'icon-192x192-maskable.png' },
  { size: 512, name: 'icon-512x512-maskable.png' },
];

const iconsDir = resolve(publicDir, 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');

// Generate standard icons
for (const { size, name } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, name));
  console.log(`  ✓ ${name} (${size}x${size})`);
}

// Generate maskable icons (add 20% padding with bg color for safe zone)
for (const { size, name } of maskableSizes) {
  const innerSize = Math.round(size * 0.8);
  const padding = Math.round((size - innerSize) / 2);

  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 10, g: 5, b: 5, alpha: 1 }, // #0a0505
    })
    .png()
    .toFile(resolve(iconsDir, name));
  console.log(`  ✓ ${name} (${size}x${size} maskable)`);
}

// Copy apple-touch-icon to root public dir as well
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(resolve(publicDir, 'apple-touch-icon.png'));
console.log('  ✓ apple-touch-icon.png (root)');

// Generate favicon.ico (32x32 PNG renamed — browsers accept PNG favicons)
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(resolve(publicDir, 'favicon.ico'));
console.log('  ✓ favicon.ico');

console.log('\nAll icons generated successfully!');
