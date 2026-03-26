/**
 * Content bridge — SDK lifecycle management for browser extensions.
 *
 * One-way settings flow: extension storage -> SDK atoms.
 * No bidirectional sync, no cloud provider, no widget position tracking.
 */

import { MSG } from './constants.js';
import { sendMessage } from './messaging.js';
import { settingsToSdkConfig, settingsToUpdatePayload } from './settings.js';

/**
 * Create a content bridge that manages the FillKit SDK lifecycle.
 *
 * @param {typeof import('@fillkit/core').FillKit} FillKitClass
 * @returns {{ init: () => Promise<void> }}
 */
export function createContentBridge(FillKitClass) {
  let instance = null;
  let currentSettings = null;
  let initialized = false;
  let initializing = false;
  let formWatcherObserver = null;

  /**
   * Check if the current page has any <form> elements.
   * @returns {boolean}
   */
  function hasForms() {
    return document.querySelectorAll('form').length > 0;
  }

  /**
   * Set up a MutationObserver that watches for <form> elements being added
   * to the DOM. When one appears, tears down the watcher and initializes the SDK.
   */
  function watchForForms() {
    if (formWatcherObserver) return;
    formWatcherObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (
            node.tagName === 'FORM' ||
            (node.querySelector && node.querySelector('form'))
          ) {
            teardownFormWatcher();
            initSDK().catch(err =>
              console.error('[FillKit Extension] Form watcher init failed:', err)
            );
            return;
          }
        }
      }
    });
    formWatcherObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Disconnect the form-watcher MutationObserver.
   */
  function teardownFormWatcher() {
    if (formWatcherObserver) {
      formWatcherObserver.disconnect();
      formWatcherObserver = null;
    }
  }

  /**
   * Initialize the SDK based on current extension settings.
   */
  async function initSDK() {
    if (initialized || initializing) return;
    initializing = true;

    try {
      const response = await sendMessage({ type: MSG.GET_SETTINGS });

      if (!response?.success) {
        throw new Error('Failed to get settings');
      }

      currentSettings = response.settings;

      if (!currentSettings.enabled) {
        return;
      }

      // Defer to page-embedded SDK if present
      const existing = globalThis.__fillkit_instance__;
      if (existing && existing.source === 'page' && existing.instance) {
        instance = existing.instance;
        initialized = true;
        return;
      }

      // Defer SDK init until page has at least one <form>
      if (!hasForms()) {
        watchForForms();
        return;
      }

      // Build config and initialize
      const config = settingsToSdkConfig(currentSettings);
      instance = await FillKitClass.init(config);

      // Register SDK event listeners (log only)
      instance.on('error', error => {
        console.error('[FillKit Extension] Error:', error);
      });

      // Remove the SDK's full-viewport overlay element.
      // Extension hides OptionsSheet + blocks help shortcut, so the overlay
      // is never needed. Some browsers hit-test against it despite
      // pointer-events:none + opacity:0 when backdrop-filter is present.
      removeOverlay();

      // Intercept keyboard shortcuts that conflict with extension
      setupShortcutInterceptions();

      // Sync widget UI state (Alt+H / Alt+I) back to extension storage
      // so it persists across pages and new tabs.
      setupUiConfigSync();

      initialized = true;
    } catch (error) {
      console.error('[FillKit Extension] Initialization failed:', error);
      initialized = false;
      instance = null;
    } finally {
      initializing = false;
    }
  }

  let uiConfigUnsub = null;

  /**
   * Subscribe to SDK uiConfig atom changes and sync `fillMode` and
   * `mainWidgetVisible` back to extension storage. This ensures Alt+H
   * and Alt+I state persists across page navigations.
   */
  function setupUiConfigSync() {
    if (uiConfigUnsub) return;

    const atoms = FillKitClass.atoms;
    if (!atoms?.uiConfig) return;

    let lastFillMode = currentSettings?.ui?.fillMode;
    let lastVisible = currentSettings?.ui?.mainWidgetVisible;

    uiConfigUnsub = atoms.uiConfig.subscribe(cfg => {
      const fillMode = cfg.fillMode;
      const visible = cfg.mainWidgetVisible;

      // Only sync when values actually changed
      if (fillMode === lastFillMode && visible === lastVisible) return;
      lastFillMode = fillMode;
      lastVisible = visible;

      sendMessage({
        type: MSG.UPDATE_SETTINGS,
        settings: {
          ui: {
            ...currentSettings?.ui,
            fillMode,
            mainWidgetVisible: visible,
          },
        },
      }).catch(() => {});
    });
  }

  /**
   * Remove the SDK's options overlay from the DOM.
   * The overlay is a full-viewport fixed element that can interfere with
   * page interactions in some browsers even when invisible.
   */
  function removeOverlay() {
    document
      .querySelectorAll('.fillkit-options-overlay')
      .forEach(el => el.remove());
  }

  /**
   * Intercept SDK keyboard shortcuts that the extension replaces:
   * - Ctrl+, / Cmd+, → redirect to extension options page
   * - Ctrl+/ / Cmd+/ → block (extension Shortcuts tab replaces it)
   * - Ctrl+Shift+/ / Cmd+Shift+/ → block (alternative help shortcut)
   */
  function setupShortcutInterceptions() {
    document.addEventListener(
      'keydown',
      event => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const mod = isMac ? event.metaKey : event.ctrlKey;

        if (!mod) return;

        // Ctrl+, or Cmd+, → open extension options page
        if (event.key === ',') {
          event.preventDefault();
          event.stopPropagation();
          sendMessage({ type: MSG.OPEN_OPTIONS_PAGE }).catch(() => {});
          return;
        }

        // Ctrl+/ or Cmd+/ → block SDK help sheet
        if (event.key === '/') {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      },
      true // Capture phase — intercept before SDK
    );
  }

  /**
   * Destroy the SDK instance and reset state.
   */
  async function destroySDK() {
    teardownFormWatcher();
    if (uiConfigUnsub) {
      uiConfigUnsub();
      uiConfigUnsub = null;
    }
    if (instance) {
      try {
        await instance.destroy();
      } catch (_error) {
        // Best effort
      }
    }
    instance = null;
    initialized = false;
  }

  /**
   * Handle SETTINGS_UPDATED messages from the background script.
   *
   * @param {Record<string, unknown>} newSettings
   */
  async function handleSettingsUpdated(newSettings) {
    const wasEnabled = currentSettings?.enabled;
    const isEnabled = newSettings.enabled;
    currentSettings = newSettings;

    // Toggled off → destroy (destroySDK tears down form watcher too)
    if (wasEnabled && !isEnabled) {
      await destroySDK();
      return;
    }

    // Toggled on → full re-init (destroy first to ensure clean state)
    if (!wasEnabled && isEnabled) {
      await destroySDK();
      // Small delay for DOM cleanup to settle before re-init
      await new Promise(r => setTimeout(r, 50));
      await initSDK();
      return;
    }

    // Still enabled with an active instance → update
    if (isEnabled && instance && initialized) {
      try {
        const { updatePayload, overrides } =
          settingsToUpdatePayload(newSettings);
        await instance.updateOptions(updatePayload);

        // Overrides must be set directly on the atom
        if (
          overrides &&
          typeof overrides === 'object' &&
          Object.keys(overrides).length >= 0
        ) {
          const currentOpts = FillKitClass.atoms.sdkOptions.get();
          FillKitClass.atoms.sdkOptions.set({
            ...currentOpts,
            overrides,
          });
        }
      } catch (error) {
        console.error('[FillKit Extension] Failed to update settings:', error);
      }
      return;
    }

    // Enabled but not yet initialized
    if (isEnabled && !initialized) {
      await initSDK();
    }
  }

  /**
   * Listen for messages from background/popup.
   */
  function setupMessageListener() {
    const onMessage =
      globalThis.browser?.runtime?.onMessage ||
      globalThis.chrome?.runtime?.onMessage;

    if (!onMessage) return;

    onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case MSG.SETTINGS_UPDATED:
          handleSettingsUpdated(message.settings).then(() =>
            sendResponse({ success: true })
          );
          return true;

        case MSG.PING:
          sendResponse({
            success: true,
            status: 'alive',
            initialized,
          });
          break;

        case MSG.GET_STATUS:
          sendResponse({
            success: true,
            initialized,
            hasInstance: !!instance,
            deferredWaitingForForms: !!formWatcherObserver,
          });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    });
  }

  return {
    async init() {
      setupMessageListener();

      if (document.readyState === 'loading') {
        await new Promise(resolve =>
          document.addEventListener('DOMContentLoaded', resolve)
        );
      }

      await initSDK();
    },
  };
}
