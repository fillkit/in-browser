<div align="center">

![FillKit](./shared/assets/logo-rect.svg)

**Browser extensions for context-aware form autofill**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/fillkit/lajjifnmncbjbdkcakmbikjanofilmld)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-FF7139?logo=firefox&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/fillkit/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

FillKit reads page structure, labels, and surrounding context to detect what each field expects — then fills it with realistic, coherent data. A checkout form gets a valid card number, matching expiry, and billing address in the same city. A signup form gets a real-looking name, email, and strong password.

- **150+ field types** — names, emails, phones, addresses, credit cards, dates, UUIDs, and more
- **50+ locales** — multilingual field detection and locale-appropriate data
- **Valid & invalid modes** — generate correct data or intentionally broken values for edge-case testing
- **Keyboard shortcuts** — `Ctrl+Shift+K` to fill all, `Alt+K` for current form, `Alt+H` to toggle widget
- **Zero config** — install and start filling. Customize via the options page when needed.

## Install

| Browser | Link                                                                       |
| ------- | -------------------------------------------------------------------------- |
| Chrome  | [Chrome Web Store](https://chromewebstore.google.com/detail/fillkit/lajjifnmncbjbdkcakmbikjanofilmld) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/fillkit/) |

## Repository Structure

```
├── shared/          Shared code (settings, messaging, UI, content bridge)
├── chrome/          Chrome MV3 extension
├── firefox/         Firefox MV3 extension
└── scripts/         Build and icon generation scripts
```

Both extensions share all UI (popup, options page) and core logic (content bridge, settings, messaging) via the `shared/` directory. Browser-specific code is minimal — thin wrappers around the shared modules.

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
# Install root dependencies (esbuild, eslint, prettier, etc.)
npm install

# Install browser-specific dependencies
cd chrome && npm install && cd ..
cd firefox && npm install && cd ..
```

### Build

```bash
# Build both extensions
npm run build

# Or build individually
npm run build:chrome
npm run build:firefox

# Generate icons (SVG -> PNG, all sizes)
npm run build:icons
```

After building:

- **Chrome**: Load `chrome/dist/` in `chrome://extensions` (Developer mode -> Load unpacked)
- **Firefox**: Load `firefox/dist/` in `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on, or run `cd firefox && npm run start`

### Watch Mode

Watches JS source files and rebuilds on changes. HTML/CSS changes require a manual re-run.

```bash
cd chrome && npm run watch   # Rebuilds on file changes
cd firefox && npm run watch
```

### Quality Checks

```bash
npm run lint:check      # ESLint (zero warnings)
npm run format:check    # Prettier
npm run validate        # Both lint + format
```

### Package for Store Submission

```bash
# Chrome — creates .zip in chrome/packages/
cd chrome && npm run package

# Firefox — creates .zip in firefox/web-ext-artifacts/
cd firefox && npm run package

# Firefox — lint manifest and built extension
cd firefox && npm run lint:web-ext
```

See [docs/publish-ext.md](./docs/publish-ext.md) for the full store submission guide.

## Keyboard Shortcuts

| Shortcut       | Action                           |
| -------------- | -------------------------------- |
| `Ctrl+Shift+K` | Fill all forms on page           |
| `Alt+K`        | Fill current form                |
| `Ctrl+Shift+L` | Clear all filled data            |
| `Alt+L`        | Clear current form               |
| `Ctrl+M`       | Toggle valid/invalid mode        |
| `Alt+H`        | Show/hide widget                 |
| `Alt+I`        | Toggle fill mode (widget/inline) |
| `Ctrl+,`       | Open settings                    |
| `Ctrl+/`       | Open help                        |
| `Ctrl+Shift+M` | Shuffle widget position          |
| `Alt+E`        | Rotate widget orientation        |

## Intended Use

FillKit is designed exclusively for **development**, **QA testing**, and **demo environments**. All generated data is synthetic — realistic but entirely fake. FillKit is not intended for filling real forms with real personal information.

## Privacy

The extensions request broad host permissions (`<all_urls>`) solely to detect and autofill forms on any page during development or testing. All processing happens locally on your device — no form data, field values, or page content is transmitted to any server. The extensions store only your preferences (locale, mode, shortcuts) in your browser's sync storage.

A future version will support an optional, opt-in connection to [FillKit Cloud](https://fillkit.dev) for enhanced field detection. When enabled, only form structure metadata (field labels, input types, HTML attributes) will be sent — never form values. Cloud mode will require explicit opt-in with an API token.

Full details: [Privacy Policy](https://fillkit.dev/privacy) | [Terms of Service](https://fillkit.dev/terms)

## Powered By

Built on [@fillkit/core](https://www.npmjs.com/package/@fillkit/core) — the same SDK available for programmatic use in your tests, demos, and development workflows.

[fillkit.dev](https://fillkit.dev) | [SDK Documentation](https://fillkit.dev/docs)

## License

[MIT](./LICENSE)
