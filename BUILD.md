# Build Instructions — FillKit Firefox Extension

## Environment

- **OS**: Linux (tested on Ubuntu 24.04); also works on macOS and Windows
- **Node.js**: >= 18.0.0 (tested with v24.14.0)
- **npm**: >= 9 (tested with v11.9.0)

No other system-level dependencies are required.

## Steps

```bash
# 1. Install root dependencies (esbuild, eslint, etc.)
npm install

# 2. Install Firefox-specific dependencies
cd firefox && npm install && cd ..

# 3. Build the Firefox extension
npm run build:firefox
```

The built extension will be in `firefox/dist/`.

## What the build does

`npm run build:firefox` runs `node scripts/build.cjs --target firefox`, which:

1. Bundles `firefox/src/content.js` → `firefox/dist/content/content.js` (esbuild, ESM → IIFE)
2. Bundles `firefox/background/service-worker.js` → `firefox/dist/background/service-worker.js`
3. Bundles `shared/ui/popup/popup.js` → `firefox/dist/popup/popup.js`
4. Bundles `shared/ui/options/options.js` → `firefox/dist/options/options.js`
5. Copies static assets (HTML, CSS, icons, manifest.json) into `firefox/dist/`

esbuild is the only build tool. It concatenates the shared JS modules into single files. No transpilation, minification, or code generation is applied — the output is readable JavaScript.

## Verification

To package the built extension into a `.zip` for submission:

```bash
cd firefox && npm run package
```

This runs `web-ext build --source-dir=dist` and outputs to `firefox/web-ext-artifacts/`.
