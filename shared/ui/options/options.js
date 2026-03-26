/**
 * FillKit Options Page
 * 4 tabs: General, Autofill, Widget, Shortcuts
 */

import { MSG } from '../../constants.js';
import { sendMessage } from '../../messaging.js';

// DOM refs
const elements = {
  // General
  mode: document.getElementById('mode'),
  locale: document.getElementById('locale'),
  emailDomain: document.getElementById('emailDomain'),
  seed: document.getElementById('seed'),
  refill: document.getElementById('refill'),
  watchMode: document.getElementById('watchMode'),

  // Autofill
  includeOutsideForms: document.getElementById('includeOutsideForms'),
  includeSelectors: document.getElementById('includeSelectors'),
  excludeSelectors: document.getElementById('excludeSelectors'),
  overrides: document.getElementById('overrides'),

  // Widget
  uiEnabled: document.getElementById('uiEnabled'),
  widgetPosition: document.getElementById('widgetPosition'),

  // UI chrome
  saveBtn: document.getElementById('saveBtn'),
  statusMessage: document.getElementById('statusMessage'),
  shortcutsBody: document.getElementById('shortcutsBody'),
  themeToggle: document.getElementById('themeToggle'),
};

let currentSettings = null;

// ============================================================
// Shortcuts data
// ============================================================

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const mod = isMac ? 'Cmd' : 'Ctrl';

const SHORTCUTS = [
  { action: 'Fill all forms', keys: `${mod}+Shift+K` },
  { action: 'Fill current form', keys: 'Alt+K' },
  { action: 'Clear all forms', keys: `${mod}+Shift+L` },
  { action: 'Clear current form', keys: 'Alt+L' },
  { action: 'Toggle valid/invalid mode', keys: `${mod}+M` },
  { action: 'Toggle widget', keys: 'Alt+H' },
  { action: 'Open settings', keys: `${mod}+, (opens this page)` },
  { action: 'Shuffle widget position', keys: `${mod}+Shift+M` },
  { action: 'Rotate widget orientation', keys: 'Alt+E' },
  { action: 'Toggle widget/inline mode', keys: 'Alt+I' },
  { action: 'Help (blocked by extension)', keys: `${mod}+/` },
];

// ============================================================
// Theme
// ============================================================

const THEME_CYCLE = ['system', 'light', 'dark'];

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'system');
  updateThemeIcon(theme || 'system');
}

function updateThemeIcon(theme) {
  const lightIcon = document.querySelector('.theme-icon-light');
  const darkIcon = document.querySelector('.theme-icon-dark');
  if (!lightIcon || !darkIcon) return;

  // Resolve effective appearance for icon display
  let isDark;
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = theme === 'dark';
  }

  // In dark mode, show sun (to switch to light); in light mode, show moon
  lightIcon.style.display = isDark ? '' : 'none';
  darkIcon.style.display = isDark ? 'none' : '';
}

function cycleTheme() {
  const current =
    document.documentElement.getAttribute('data-theme') || 'system';
  const idx = THEME_CYCLE.indexOf(current);
  const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
  applyTheme(next);
  return next;
}

// ============================================================
// Init
// ============================================================

async function init() {
  try {
    const response = await sendMessage({ type: MSG.GET_SETTINGS });
    if (response?.success) {
      currentSettings = response.settings;
      applyTheme(currentSettings.theme);
      populateForm(currentSettings);
    } else {
      throw new Error('Failed to get settings');
    }

    setupEventListeners();
    setupTabs();
    populateShortcuts();
  } catch (error) {
    console.error('[FillKit Options] Init failed:', error);
    showStatus('Failed to load settings. Please refresh.', 'error');
  }
}

// ============================================================
// Populate form
// ============================================================

function populateForm(s) {
  elements.mode.value = s.mode || 'valid';
  elements.locale.value = s.locale || 'en';
  elements.emailDomain.value = s.emailDomain || 'example.com';
  elements.seed.value =
    s.seed !== null && s.seed !== undefined ? String(s.seed) : '';
  elements.refill.checked = s.refill ?? true;
  elements.watchMode.checked = s.watchMode ?? true;

  elements.includeOutsideForms.checked = s.includeOutsideForms || false;

  if (Array.isArray(s.includeSelectors)) {
    elements.includeSelectors.value = s.includeSelectors.join(', ');
  }
  if (Array.isArray(s.excludeSelectors)) {
    elements.excludeSelectors.value = s.excludeSelectors.join(', ');
  }
  if (s.overrides && typeof s.overrides === 'object') {
    elements.overrides.value = Object.keys(s.overrides).length
      ? JSON.stringify(s.overrides, null, 2)
      : '';
  }

  elements.uiEnabled.checked = s.ui?.enabled ?? true;
  elements.widgetPosition.value = s.ui?.position || 'bottom.center';

  // Fill mode radio
  const fillMode = s.ui?.fillMode || 'widget';
  const radio = document.querySelector(
    `input[name="fillMode"][value="${fillMode}"]`
  );
  if (radio) radio.checked = true;
}

// ============================================================
// Shortcuts table
// ============================================================

function populateShortcuts() {
  if (!elements.shortcutsBody) return;

  elements.shortcutsBody.textContent = '';
  for (const s of SHORTCUTS) {
    const tr = document.createElement('tr');
    const tdAction = document.createElement('td');
    tdAction.textContent = s.action;
    tr.appendChild(tdAction);

    const tdKeys = document.createElement('td');
    const parts = s.keys.split('+');
    parts.forEach((k, i) => {
      if (i > 0) tdKeys.appendChild(document.createTextNode(' + '));
      const kbd = document.createElement('kbd');
      kbd.textContent = k.trim();
      tdKeys.appendChild(kbd);
    });
    tr.appendChild(tdKeys);
    elements.shortcutsBody.appendChild(tr);
  }
}

// ============================================================
// Tab navigation
// ============================================================

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });
}

// ============================================================
// Event listeners
// ============================================================

function setupEventListeners() {
  elements.saveBtn.addEventListener('click', saveSettings);

  // Theme toggle — cycle and save immediately
  elements.themeToggle.addEventListener('click', async () => {
    const next = cycleTheme();
    try {
      await sendMessage({
        type: MSG.UPDATE_SETTINGS,
        settings: { theme: next },
      });
    } catch (_e) {
      // Best effort
    }
  });

  // Ctrl+S / Cmd+S
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
    if (e.key === 'Escape') {
      elements.statusMessage.style.display = 'none';
    }
  });
}

// ============================================================
// Save — DOM helpers
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSpinnerSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'animate-spin');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '10');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '4');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('opacity', '0.25');
  svg.appendChild(circle);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute(
    'd',
    'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
  );
  path.setAttribute('opacity', '0.75');
  svg.appendChild(path);

  return svg;
}

function createCheckSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('viewBox', '0 0 24 24');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('d', 'M5 13l4 4L19 7');
  svg.appendChild(path);

  return svg;
}

function setButtonContent(btn, svgEl, text) {
  btn.textContent = '';
  btn.appendChild(svgEl);
  btn.appendChild(document.createTextNode(' ' + text));
}

// ============================================================
// Save
// ============================================================

async function saveSettings() {
  try {
    elements.saveBtn.disabled = true;
    setButtonContent(elements.saveBtn, createSpinnerSvg(), 'Saving...');

    // Validate overrides JSON
    let overrides = {};
    if (elements.overrides.value.trim()) {
      try {
        overrides = JSON.parse(elements.overrides.value);
        if (typeof overrides !== 'object' || Array.isArray(overrides)) {
          throw new Error('Overrides must be a JSON object');
        }
      } catch (error) {
        showStatus(`Invalid JSON in overrides: ${error.message}`, 'error');
        resetSaveButton();
        return;
      }
    }

    const parseSelectors = value => {
      if (!value.trim()) return [];
      return value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    };

    const fillModeRadio = document.querySelector(
      'input[name="fillMode"]:checked'
    );

    const settings = {
      // Preserve enabled state (popup controls this)
      enabled: currentSettings?.enabled ?? true,

      mode: elements.mode.value,
      locale: elements.locale.value,
      emailDomain: elements.emailDomain.value,
      seed:
        elements.seed.value.trim() !== ''
          ? parseInt(elements.seed.value, 10)
          : null,
      refill: elements.refill.checked,
      watchMode: elements.watchMode.checked,

      includeOutsideForms: elements.includeOutsideForms.checked,
      includeSelectors: parseSelectors(elements.includeSelectors.value),
      excludeSelectors: parseSelectors(elements.excludeSelectors.value),
      overrides,

      ui: {
        enabled: elements.uiEnabled.checked,
        position: elements.widgetPosition.value,
        fillMode: fillModeRadio?.value || 'widget',
      },

      theme:
        document.documentElement.getAttribute('data-theme') ||
        currentSettings?.theme ||
        'system',
      logLevel: currentSettings?.logLevel || 'error',
    };

    // Validate seed
    if (
      settings.seed !== null &&
      (isNaN(settings.seed) ||
        settings.seed < 0 ||
        !Number.isInteger(settings.seed))
    ) {
      showStatus('Seed must be a non-negative integer or empty.', 'error');
      resetSaveButton();
      return;
    }

    const response = await sendMessage({
      type: MSG.UPDATE_SETTINGS,
      settings,
    });

    if (response?.success) {
      currentSettings = response.settings;
      showStatus('Settings saved! Changes apply to all tabs.', 'success');
    } else {
      throw new Error(response?.error || 'Failed to save');
    }
  } catch (error) {
    console.error('[FillKit Options] Save failed:', error);
    showStatus(`Failed to save: ${error.message}`, 'error');
  } finally {
    resetSaveButton();
  }
}

function resetSaveButton() {
  elements.saveBtn.disabled = false;
  setButtonContent(elements.saveBtn, createCheckSvg(), 'Save Changes');
}

// ============================================================
// Status messages
// ============================================================

function showStatus(message, type = 'info') {
  const el = elements.statusMessage;
  el.className = `alert alert-${type}`;
  el.textContent = '';
  const div = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = message;
  div.appendChild(p);
  el.appendChild(div);
  el.style.display = 'flex';

  if (type === 'success') {
    setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }
}

// ============================================================
// Start
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
