/**
 * scripts/build-package.js
 * Builds and packages Snip Chrome extension into a clean release ZIP for GitHub.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('📦 Starting Snip packaging...');

// Verify essential files
const requiredFiles = [
  'manifest.json',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'background/service-worker.js',
  'background/context-menus.js',
  'content/content.js',
  'content/element-scanner.js',
  'content/overlay.js',
  'content/overlay.css',
  'content/action-executor.js',
  'content/youtube.js',
  'vendor/Readability.js',
  'services/gemini.js',
  'services/prompts.js',
  'services/storage.js',
  'services/safety.js',
  'services/profile.js',
  'services/skills.js',
  'services/agent-planner.js',
  'services/tab-bridge.js',
  'sidepanel/sidepanel.html',
  'sidepanel/sidepanel.css',
  'sidepanel/sidepanel.js',
  'sidepanel/summarize.js',
  'sidepanel/chat.js',
  'sidepanel/agent.js',
  'sidepanel/vision.js',
  'sidepanel/profile.js',
  'sidepanel/skills.js',
  'sidepanel/error-handler.js'
];

for (const file of requiredFiles) {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipName = 'snip-extension-v1.0.0.zip';
const zipPath = path.join(distDir, zipName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Files and folders to include in the release ZIP
const itemsToInclude = [
  'manifest.json',
  'background',
  'content',
  'sidepanel',
  'services',
  'vendor',
  'icons',
  'README.md',
  'architecture.md',
  'edgecase.md',
  'implementation.md'
];

const pathsArg = itemsToInclude.map(i => `'${path.join(rootDir, i)}'`).join(', ');

const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path ${pathsArg} -DestinationPath '${zipPath}' -Force"`;

try {
  console.log('⚡ Compressing release assets into ZIP...');
  execSync(psCommand, { stdio: 'inherit' });
  const stats = fs.statSync(zipPath);
  console.log(`✅ Success! Release packaged at: ${zipPath} (${Math.round(stats.size / 1024)} KB)`);
} catch (err) {
  console.error('❌ Failed to create zip package:', err.message);
  process.exit(1);
}
