/**
 * Unified build script for FillKit browser extensions
 * Usage: node scripts/build.cjs --target chrome|firefox [--watch]
 *
 * Bundles shared/ modules via esbuild, copies UI assets to <target>/dist/
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const target = getArg('target');
const watch = args.includes('--watch');

if (!target || !['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node scripts/build.cjs --target chrome|firefox [--watch]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Paths (all relative to repo root: extensions/)
// ---------------------------------------------------------------------------

const ROOT_DIR = path.join(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, target);
const SHARED_DIR = path.join(ROOT_DIR, 'shared');
const DIST_DIR = path.join(TARGET_DIR, 'dist');

// ---------------------------------------------------------------------------
// Target-specific config
// ---------------------------------------------------------------------------

const TARGET_CONFIG = {
  chrome: {
    esbuildTarget: ['chrome109'],
    external: ['chrome'],
    label: 'Chrome',
    postMessage:
      'Load in chrome://extensions (Developer mode -> Load unpacked)',
  },
  firefox: {
    esbuildTarget: ['firefox140'],
    external: [],
    label: 'Firefox',
    postMessage:
      'Test: about:debugging#/runtime/this-firefox -> Load Temporary Add-on\nOr: cd firefox && npm run start',
  },
};

const config = TARGET_CONFIG[target];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(
    `  copied ${path.basename(src)} -> ${path.relative(TARGET_DIR, dest)}`,
  );
}

function copyDir(src, dest, excludes = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludes.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d, excludes);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point configs
// ---------------------------------------------------------------------------

function getEntryConfigs(commonOpts) {
  return [
    {
      label: 'content script',
      ...commonOpts,
      entryPoints: [path.join(TARGET_DIR, 'src/content.js')],
      outfile: path.join(DIST_DIR, 'content/content.js'),
    },
    {
      label: 'background service worker',
      ...commonOpts,
      entryPoints: [path.join(TARGET_DIR, 'background/service-worker.js')],
      outfile: path.join(DIST_DIR, 'background/service-worker.js'),
    },
    {
      label: 'popup',
      ...commonOpts,
      entryPoints: [path.join(SHARED_DIR, 'ui/popup/popup.js')],
      outfile: path.join(DIST_DIR, 'popup/popup.js'),
    },
    {
      label: 'options',
      ...commonOpts,
      entryPoints: [path.join(SHARED_DIR, 'ui/options/options.js')],
      outfile: path.join(DIST_DIR, 'options/options.js'),
    },
  ];
}

// ---------------------------------------------------------------------------
// Static assets
// ---------------------------------------------------------------------------

function copyStaticAssets() {
  console.log('\nCopying static assets...');

  // Shared popup HTML + CSS
  copyFile(
    path.join(SHARED_DIR, 'ui/popup/popup.html'),
    path.join(DIST_DIR, 'popup/popup.html'),
  );
  copyFile(
    path.join(SHARED_DIR, 'ui/popup/popup.css'),
    path.join(DIST_DIR, 'popup/popup.css'),
  );

  // Shared options HTML + CSS
  copyFile(
    path.join(SHARED_DIR, 'ui/options/options.html'),
    path.join(DIST_DIR, 'options/options.html'),
  );
  copyFile(
    path.join(SHARED_DIR, 'ui/options/options.css'),
    path.join(DIST_DIR, 'options/options.css'),
  );

  // Shared welcome HTML + CSS
  copyFile(
    path.join(SHARED_DIR, 'ui/welcome/welcome.html'),
    path.join(DIST_DIR, 'welcome/welcome.html'),
  );
  copyFile(
    path.join(SHARED_DIR, 'ui/welcome/welcome.css'),
    path.join(DIST_DIR, 'welcome/welcome.css'),
  );
  copyFile(
    path.join(SHARED_DIR, 'ui/welcome/welcome.js'),
    path.join(DIST_DIR, 'welcome/welcome.js'),
  );

  // Shared assets (logos)
  const assetsDir = path.join(SHARED_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyDir(assetsDir, path.join(DIST_DIR, 'assets'));
    console.log('  copied assets/');
  }

  // Manifest
  copyFile(
    path.join(TARGET_DIR, 'manifest.json'),
    path.join(DIST_DIR, 'manifest.json'),
  );

  // Icons
  const iconsDir = path.join(TARGET_DIR, 'icons');
  if (fs.existsSync(iconsDir)) {
    copyDir(iconsDir, path.join(DIST_DIR, 'icons'), [
      'generate-icons.cjs',
      'README.md',
      'icon.svg',
    ]);
    console.log('  copied icons/');
  }

  // Verify icons
  const iconSizes = [16, 32, 48, 128];
  let missing = false;
  for (const size of iconSizes) {
    const p = path.join(DIST_DIR, 'icons', `icon-${size}.png`);
    if (!fs.existsSync(p)) {
      console.warn(`  warning: icon-${size}.png not found`);
      missing = true;
    }
  }
  if (missing) {
    console.log('  Run: npm run build:icons (from extensions root)');
  }
}

// ---------------------------------------------------------------------------
// Build (one-shot)
// ---------------------------------------------------------------------------

async function build() {
  console.log(`Building FillKit ${config.label} Extension...\n`);

  // Clean
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const commonOpts = {
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: config.esbuildTarget,
    sourcemap: false,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    external: config.external,
  };

  const entries = getEntryConfigs(commonOpts);
  for (let i = 0; i < entries.length; i++) {
    const { label, ...opts } = entries[i];
    console.log(`${i + 1}/${entries.length}  Bundling ${label}...`);
    await esbuild.build(opts);
  }

  copyStaticAssets();

  console.log(`\nBuild complete: ${path.relative(process.cwd(), DIST_DIR)}`);
  console.log(config.postMessage);
}

// ---------------------------------------------------------------------------
// Watch mode
// ---------------------------------------------------------------------------

async function buildAndWatch() {
  console.log(`Building FillKit ${config.label} Extension (watch mode)...\n`);

  // Clean
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const commonOpts = {
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: config.esbuildTarget,
    sourcemap: true,
    minify: false,
    define: { 'process.env.NODE_ENV': '"development"' },
    external: config.external,
  };

  const entries = getEntryConfigs(commonOpts);
  const contexts = [];

  for (let i = 0; i < entries.length; i++) {
    const { label, ...opts } = entries[i];
    console.log(`${i + 1}/${entries.length}  Bundling ${label}...`);

    const watchPlugin = {
      name: 'rebuild-notify',
      setup(build) {
        let firstBuild = true;
        build.onEnd((result) => {
          if (firstBuild) {
            firstBuild = false;
            return;
          }
          if (result.errors.length > 0) {
            console.log(`[${label}] rebuild failed with ${result.errors.length} error(s)`);
          } else {
            console.log(`[${label}] rebuilt successfully`);
          }
        });
      },
    };

    const ctx = await esbuild.context({
      ...opts,
      plugins: [watchPlugin],
    });
    await ctx.rebuild();
    contexts.push(ctx);
  }

  // Copy static assets once
  copyStaticAssets();

  // Start watching all contexts
  for (const ctx of contexts) {
    await ctx.watch();
  }

  console.log(`\nBuild complete: ${path.relative(process.cwd(), DIST_DIR)}`);
  console.log('\nWatching for changes... (Ctrl+C to stop)');
  console.log('Note: only JS bundles are watched; HTML/CSS changes need manual re-run.\n');
  console.log(config.postMessage);

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\nStopping watchers...');
    for (const ctx of contexts) {
      await ctx.dispose();
    }
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(watch ? buildAndWatch() : build()).catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
