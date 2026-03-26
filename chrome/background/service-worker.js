/**
 * FillKit Chrome Background Service Worker
 * Thin wrapper — all logic lives in shared/
 */

import { MSG, STORAGE_KEY } from '../../shared/constants.js';
import { DEFAULT_SETTINGS, mergeSettings } from '../../shared/settings.js';

// --- Install / Update ---------------------------------------------------

chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install') {
    await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  } else if (details.reason === 'update') {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const saved = data[STORAGE_KEY] || {};
    await chrome.storage.sync.set({
      [STORAGE_KEY]: mergeSettings(saved),
    });
  }
});

// --- Message handler ----------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case MSG.GET_SETTINGS:
      handleGetSettings().then(sendResponse);
      return true;

    case MSG.UPDATE_SETTINGS:
      handleUpdateSettings(message.settings).then(sendResponse);
      return true;

    case MSG.OPEN_OPTIONS_PAGE:
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// --- Handlers -----------------------------------------------------------

async function handleGetSettings() {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const settings = mergeSettings(data[STORAGE_KEY] || {});
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleUpdateSettings(incoming) {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const current = data[STORAGE_KEY] || {};
    const updated = mergeSettings({ ...current, ...incoming }, current);

    // Deep merge ui
    if (incoming.ui) {
      updated.ui = { ...(current.ui || {}), ...incoming.ui };
    }

    await chrome.storage.sync.set({ [STORAGE_KEY]: updated });

    // Broadcast to all tabs (fire-and-forget — don't block the response)
    chrome.tabs.query({}).then(tabs => {
      for (const tab of tabs) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: MSG.SETTINGS_UPDATED,
            settings: updated,
          })
          .catch(() => {});
      }
    });

    return { success: true, settings: updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
