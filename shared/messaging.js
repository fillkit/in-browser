/**
 * Shared messaging utilities for FillKit browser extensions
 */

let _browserAPI = null;

/**
 * Get the browser extension API (cached).
 * Returns `browser` (Firefox) or `chrome` (Chrome).
 *
 * @returns {typeof chrome}
 */
export function getBrowserAPI() {
  if (!_browserAPI) {
    _browserAPI = globalThis.browser || globalThis.chrome;
  }
  return _browserAPI;
}

/**
 * Send a message to the background service worker with retry logic.
 * Implements exponential backoff for transient failures.
 *
 * @param {Record<string, unknown>} message
 * @param {number} [maxRetries=3]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function sendMessage(message, maxRetries = 3) {
  const api = getBrowserAPI();
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await api.runtime.sendMessage(message);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(100 * Math.pow(2, attempt), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Broadcast a message to all open tabs.
 * Swallows errors for tabs without content scripts.
 *
 * @param {Record<string, unknown>} message
 * @returns {Promise<number>} Number of tabs that received the message
 */
export async function broadcastToAllTabs(message) {
  const api = getBrowserAPI();
  const tabs = await api.tabs.query({});
  let count = 0;

  for (const tab of tabs) {
    try {
      await api.tabs.sendMessage(tab.id, message);
      count++;
    } catch (_error) {
      // Tab might not have content script injected
    }
  }

  return count;
}

/**
 * Open the extension options page.
 */
export function openOptionsPage() {
  const api = getBrowserAPI();
  api.runtime.openOptionsPage();
}
