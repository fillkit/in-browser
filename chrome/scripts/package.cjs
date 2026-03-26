/**
 * Package script for FillKit Chrome Extension
 * Creates a ZIP file for Chrome Web Store submission
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PACKAGE_DIR = path.join(ROOT_DIR, 'packages');

/**
 * Get version from manifest
 */
function getVersion() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      'manifest.json not found in dist/. Please run build first.'
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest.version;
}

/**
 * Create ZIP package
 */
async function createPackage() {
  console.log('Packaging FillKit Chrome Extension...\n');

  try {
    // Check if dist exists
    if (!fs.existsSync(DIST_DIR)) {
      console.error('Error: dist/ directory not found!');
      console.error('\nPlease build the extension first:');
      console.error('  npm run build\n');
      process.exit(1);
    }

    // Get version
    const version = getVersion();
    console.log(`Version: ${version}\n`);

    // Create packages directory
    fs.mkdirSync(PACKAGE_DIR, { recursive: true });

    // Create ZIP file
    const zipName = `fillkit-chrome-${version}.zip`;
    const zipPath = path.join(PACKAGE_DIR, zipName);

    // Remove existing package
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log(`Removed existing ${zipName}`);
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`\nPackage created successfully!`);
        console.log(`  File: ${zipName}`);
        console.log(`  Size: ${sizeInMB} MB`);
        console.log(`  Path: ${path.relative(process.cwd(), zipPath)}`);
        console.log('\nReady for Chrome Web Store upload.\n');
        resolve();
      });

      archive.on('error', err => {
        reject(err);
      });

      archive.on('warning', err => {
        if (err.code === 'ENOENT') {
          console.warn('Warning:', err.message);
        } else {
          reject(err);
        }
      });

      // Progress indicator
      let lastProgress = 0;
      archive.on('progress', progress => {
        const percent = Math.floor(
          (progress.entries.processed / progress.entries.total) * 100
        );
        if (percent !== lastProgress && percent % 10 === 0) {
          console.log(`   Progress: ${percent}%`);
          lastProgress = percent;
        }
      });

      archive.pipe(output);

      // Add all files from dist directory
      console.log('Adding files to package...');
      archive.directory(DIST_DIR, false);

      archive.finalize();
    });
  } catch (error) {
    console.error('\nPackaging failed:', error.message);
    process.exit(1);
  }
}

// Run packaging
createPackage();
