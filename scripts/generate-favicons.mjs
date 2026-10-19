#!/usr/bin/env node

/**
 * Build-time Favicon & Web Manifest Generator
 *
 * Generates the complete favicon asset suite:
 * - favicon.svg (Vector)
 * - favicon-16x16.png
 * - favicon-32x32.png
 * - apple-touch-icon.png (180x180)
 * - android-chrome-192x192.png (192x192)
 * - android-chrome-512x512.png (512x512)
 * - favicon.ico (multi-resolution 16x16 & 32x32)
 * - site.webmanifest
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1: ICO
  header.writeUInt16LE(count, 4); // count of images

  let offset = 6 + count * 16;
  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bit count (32-bit RGBA)
    entry.writeUInt32LE(img.buffer.length, 8); // image byte size
    entry.writeUInt32LE(offset, 12); // image data offset
    offset += img.buffer.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}

async function generateFavicons() {
  console.log('🎨 Generating Favicon Suite & Web Manifest...');

  const svgPath = path.join(PUBLIC_DIR, 'favicon.svg');
  if (!fs.existsSync(svgPath)) {
    throw new Error(`favicon.svg not found at ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // Generate PNGs at required dimensions
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), png16);

  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), png32);

  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), png180);

  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'android-chrome-192x192.png'), png192);

  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'android-chrome-512x512.png'), png512);

  // Pack multi-resolution favicon.ico
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
  ]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

  // Update site.webmanifest
  const manifest = {
    name: 'Online Invoice Creator',
    short_name: 'InvoiceCreator',
    description: 'Free, private online invoice and receipt generator with instant PDF downloads.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0c',
    theme_color: '#494fdf',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2) + '\n'
  );

  console.log('✅ Favicon suite and web manifest generated successfully:');
  console.log('   • public/favicon.svg');
  console.log('   • public/favicon.ico');
  console.log('   • public/favicon-16x16.png');
  console.log('   • public/favicon-32x32.png');
  console.log('   • public/apple-touch-icon.png');
  console.log('   • public/android-chrome-192x192.png');
  console.log('   • public/android-chrome-512x512.png');
  console.log('   • public/site.webmanifest');
}

generateFavicons().catch((err) => {
  console.error('❌ Failed to generate favicons:', err);
  process.exit(1);
});
