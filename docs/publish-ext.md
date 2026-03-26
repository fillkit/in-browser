# Publishing FillKit Browser Extensions

Guide for submitting to Chrome Web Store and Firefox Add-ons (AMO).

## Chrome Web Store

### Dashboard

<https://chrome.google.com/webstore/developer/dashboard>

### Prerequisites

- Google account with 2-step verification enabled
- One-time $5 developer registration fee

### Required Assets

Per [Chrome Web Store images documentation](https://developer.chrome.com/docs/webstore/images):

| Asset             | Dimensions  | Notes                                |
| ----------------- | ----------- | ------------------------------------ |
| Extension icon    | 128x128 px  | 96px artwork + 16px padding per side |
| Small promo image | 440x280 px  | **Mandatory**                        |
| Screenshots       | 1280x800 px | **Mandatory**, 1-5 screenshots       |

### Privacy Policy

**Required** because the extension uses `<all_urls>` host permission.

Enter `https://fillkit.dev/privacy` in the Privacy tab of the developer dashboard.

Per [Chrome privacy policies](https://developer.chrome.com/docs/webstore/program-policies/privacy).

### Permissions Justification

When submitting, Chrome requires written justification for each permission:

| Permission                      | Justification                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                       | Stores user preferences: locale, fill mode, widget position, and theme settings.                                                                             |
| `<all_urls>` (host_permissions) | Content script must run on any page to detect and fill form fields. No data is collected or transmitted to external servers. All processing happens locally. |

### Submission Steps

1. Build and package:

   ```bash
   npm run build:chrome
   cd chrome && npm run package
   ```

2. Upload `chrome/packages/fillkit-chrome-{version}.zip` to the developer dashboard.

3. Fill in listing details:
   - **Category**: Developer Tools
   - **Language**: English
   - Upload icon, promo image, and screenshots
   - Enter privacy policy URL
   - Fill in permissions justifications

4. Submit for review.

### Review Timeline

3-7 days on average; up to 3 weeks for extensions requesting sensitive permissions like `<all_urls>`. See [Chrome review process](https://developer.chrome.com/docs/webstore/review-process).

---

## Firefox Add-ons (AMO)

### Developer Hub

<https://addons.mozilla.org/en-US/developers/>

### Max File Size

200 MB per [AMO submission docs](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).

### Source Code Submission

**Required** for bundled extensions per [AMO source code policy](https://extensionworkshop.com/documentation/publish/source-code-submission/).

Options:

- Link to open source repo: `https://github.com/fillkit/in-browser`
- Or upload a zip of `extensions/` (excluding `node_modules/`, `dist/`)

Build instructions for AMO reviewer:

```bash
npm install
cd chrome && npm install && cd ..
cd firefox && npm install && cd ..
npm run build:firefox
```

The reviewer will rebuild from source and diff against the submitted zip.

### Signing

Use `web-ext sign` with JWT credentials from the [AMO credentials page](https://addons.mozilla.org/en-US/developers/addon/api/key/):

```bash
cd firefox
web-ext sign --source-dir=dist --channel=listed \
  --api-key=$AMO_JWT_ISSUER \
  --api-secret=$AMO_JWT_SECRET
```

- `--api-key` = JWT issuer
- `--api-secret` = JWT secret

### Assets

Icon and screenshots are recommended but not mandatory per [AMO listing docs](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/).

### Submission Steps

1. Build and package:

   ```bash
   npm run build:firefox
   cd firefox && npm run lint:web-ext
   cd firefox && npm run package
   ```

2. Upload `firefox/web-ext-artifacts/fillkit_*.zip` to the developer hub.

3. Fill in listing details:
   - **Category**: Developer Tools
   - Upload icon and screenshots (optional but recommended)
   - Provide source code link or zip

4. Submit for review.

---

## Version Bumping Checklist

All files that need version updates before each release:

| #   | File                             | Field               |
| --- | -------------------------------- | ------------------- |
| 1   | `chrome/manifest.json`           | `"version"`         |
| 2   | `firefox/manifest.json`          | `"version"`         |
| 3   | `package.json` (root)            | `"version"`         |
| 4   | `chrome/package.json`            | `"version"`         |
| 5   | `firefox/package.json`           | `"version"`         |
| 6   | `shared/ui/popup/popup.html`     | Footer version text |
| 7   | `shared/ui/options/options.html` | Footer version text |

---

## Pre-Submission Checklist

- [ ] Privacy policy URL live: `https://fillkit.dev/privacy`
- [ ] Source code public: `https://github.com/fillkit/in-browser`
- [ ] Store screenshots prepared (1280x800)
- [ ] Chrome promo image prepared (440x280)
- [ ] `npm run build` succeeds for both targets
- [ ] `cd firefox && npm run lint:web-ext` passes with 0 warnings
- [ ] All permissions have written justifications (see table above)
- [ ] Google account has 2-step verification enabled
- [ ] Version numbers updated in all 7 files (see checklist above)
