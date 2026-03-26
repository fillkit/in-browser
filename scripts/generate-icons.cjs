/**
 * Generate PNG icons from shared SVG source
 * Usage: node scripts/generate-icons.cjs
 *
 * Reads shared/assets/logo.svg and generates PNGs into
 * chrome/icons/ and firefox/icons/
 */

const path = require('path');
const fs = require('fs');

async function generateIcons() {
  try {
    const sharp = require('sharp');

    const ROOT_DIR = path.join(__dirname, '..');
    const svgPath = path.join(ROOT_DIR, 'shared', 'assets', 'logo.svg');

    if (!fs.existsSync(svgPath)) {
      console.error(`SVG source not found: ${svgPath}`);
      process.exit(1);
    }

    const targets = ['chrome', 'firefox'];
    const sizes = [16, 32, 48, 128];

    console.log(`Generating icons from shared/assets/logo.svg...\n`);

    for (const target of targets) {
      const iconsDir = path.join(ROOT_DIR, target, 'icons');
      fs.mkdirSync(iconsDir, { recursive: true });

      for (const size of sizes) {
        const outputPath = path.join(iconsDir, `icon-${size}.png`);
        await sharp(svgPath).resize(size, size).png().toFile(outputPath);
        console.log(`  ${target}/icons/icon-${size}.png`);
      }
    }

    console.log('\nAll icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Error: sharp module not found.');
      console.error('\nInstall from extensions root:');
      console.error('  npm install\n');
    } else {
      console.error('Error generating icons:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
