/**
 * FillKit Popup — Minimal enable/disable + settings link
 */

import { MSG } from '../../constants.js';
import { sendMessage } from '../../messaging.js';

const statusEl = document.getElementById('status');
const statusText = document.querySelector('.status-text');
const enableToggle = document.getElementById('enableToggle');
const settingsLink = document.getElementById('settingsLink');
const seedInput = document.getElementById('seedInput');

let currentSettings = null;

function updateStatus(state, text) {
  statusEl.className = `status ${state}`;
  statusText.textContent = text;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'system');
}

/**
 * Query the active tab's content script for SDK status.
 * Returns null if the tab has no content script (e.g. chrome:// pages).
 */
async function getActiveTabStatus() {
  const api = globalThis.browser || globalThis.chrome;
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    const response = await api.tabs.sendMessage(tab.id, {
      type: MSG.GET_STATUS,
    });
    return response?.success ? response : null;
  } catch {
    return null;
  }
}

function updateUI(tabStatus) {
  if (!currentSettings) return;

  applyTheme(currentSettings.theme);

  // Populate seed
  seedInput.value =
    currentSettings.seed !== null && currentSettings.seed !== undefined
      ? String(currentSettings.seed)
      : '';

  const enabled = currentSettings.enabled !== false;
  enableToggle.checked = enabled;

  const noForms = tabStatus?.deferredWaitingForForms === true;

  if (noForms && enabled) {
    updateStatus('no-forms', 'No Forms');
    enableToggle.disabled = true;
    seedInput.disabled = true;
  } else {
    enableToggle.disabled = false;
    seedInput.disabled = false;
    updateStatus(
      enabled ? 'enabled' : 'disabled',
      enabled ? 'Active' : 'Disabled'
    );
  }
}

async function loadSettings() {
  try {
    const response = await sendMessage({ type: MSG.GET_SETTINGS });
    if (response?.success && response.settings) {
      currentSettings = response.settings;
      const tabStatus = await getActiveTabStatus();
      updateUI(tabStatus);
    } else {
      throw new Error('Failed to load settings');
    }
  } catch (error) {
    console.error('[FillKit Popup] Failed to load settings:', error);
    updateStatus('disabled', 'Error');
  }
}

// Toggle handler
enableToggle.addEventListener('change', async () => {
  const enabled = enableToggle.checked;
  try {
    const response = await sendMessage({
      type: MSG.UPDATE_SETTINGS,
      settings: { enabled },
    });
    if (response?.success) {
      currentSettings = response.settings;
      const tabStatus = await getActiveTabStatus();
      updateUI(tabStatus);
    }
  } catch (error) {
    console.error('[FillKit Popup] Toggle error:', error);
    enableToggle.checked = !enabled;
  }
});

// Seed quick-edit — saves on blur or Enter
seedInput.addEventListener('change', async () => {
  const raw = seedInput.value.trim();
  const seed = raw !== '' ? parseInt(raw, 10) : null;

  if (seed !== null && (isNaN(seed) || seed < 0 || !Number.isInteger(seed))) {
    seedInput.value =
      currentSettings?.seed != null ? String(currentSettings.seed) : '';
    return;
  }

  try {
    const response = await sendMessage({
      type: MSG.UPDATE_SETTINGS,
      settings: { seed },
    });
    if (response?.success) {
      currentSettings = response.settings;
      const tabStatus = await getActiveTabStatus();
      updateUI(tabStatus);
    }
  } catch (error) {
    console.error('[FillKit Popup] Seed update error:', error);
    seedInput.value =
      currentSettings?.seed != null ? String(currentSettings.seed) : '';
  }
});

// Settings link → open options page
settingsLink.addEventListener('click', e => {
  e.preventDefault();
  sendMessage({ type: MSG.OPEN_OPTIONS_PAGE }).catch(() => {});
  window.close();
});

// Listen for settings broadcasts
const onMessage =
  globalThis.browser?.runtime?.onMessage ||
  globalThis.chrome?.runtime?.onMessage;

if (onMessage) {
  onMessage.addListener(async message => {
    if (message.type === MSG.SETTINGS_UPDATED && message.settings) {
      currentSettings = message.settings;
      const tabStatus = await getActiveTabStatus();
      updateUI(tabStatus);
    }
  });
}

// Init
loadSettings();
