/**
 * Shared settings management for FillKit browser extensions
 */

/** Default extension settings — single source of truth */
export const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'valid',
  locale: 'en',
  emailDomain: 'example.com',
  seed: null,
  refill: true,
  watchMode: true,
  includeOutsideForms: false,
  includeSelectors: [],
  excludeSelectors: [],
  overrides: {},
  ui: {
    enabled: true,
    position: 'bottom.center',
    fillMode: 'widget',
    mainWidgetVisible: true,
  },
  theme: 'system', // "light" | "dark" | "system"
  logLevel: 'error',
};

/**
 * Deep-merge saved settings with defaults.
 * Fills missing keys from defaults; handles nested `ui` object.
 *
 * @param {Record<string, unknown>} saved
 * @param {Record<string, unknown>} [defaults]
 * @returns {Record<string, unknown>}
 */
export function mergeSettings(saved, defaults = DEFAULT_SETTINGS) {
  const merged = { ...defaults, ...saved };

  // Deep merge the ui object
  if (saved.ui || defaults.ui) {
    merged.ui = {
      ...(defaults.ui || {}),
      ...(saved.ui || {}),
    };
  }

  // Ensure arrays are actual arrays
  if (!Array.isArray(merged.includeSelectors)) {
    merged.includeSelectors = [];
  }
  if (!Array.isArray(merged.excludeSelectors)) {
    merged.excludeSelectors = [];
  }
  if (
    merged.overrides === null ||
    typeof merged.overrides !== 'object' ||
    Array.isArray(merged.overrides)
  ) {
    merged.overrides = {};
  }

  return merged;
}

/**
 * Validate settings object. Returns { valid, errors }.
 *
 * @param {Record<string, unknown>} settings
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSettings(settings) {
  const errors = [];

  if (typeof settings.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  if (!['valid', 'invalid'].includes(settings.mode)) {
    errors.push('mode must be "valid" or "invalid"');
  }
  if (typeof settings.locale !== 'string' || !settings.locale) {
    errors.push('locale must be a non-empty string');
  }
  if (typeof settings.emailDomain !== 'string') {
    errors.push('emailDomain must be a string');
  }
  if (settings.seed !== null && settings.seed !== undefined) {
    if (
      typeof settings.seed !== 'number' ||
      !Number.isInteger(settings.seed) ||
      settings.seed < 0
    ) {
      errors.push('seed must be null or a non-negative integer');
    }
  }
  if (typeof settings.refill !== 'boolean') {
    errors.push('refill must be a boolean');
  }
  if (typeof settings.watchMode !== 'boolean') {
    errors.push('watchMode must be a boolean');
  }
  if (typeof settings.includeOutsideForms !== 'boolean') {
    errors.push('includeOutsideForms must be a boolean');
  }
  if (!Array.isArray(settings.includeSelectors)) {
    errors.push('includeSelectors must be an array');
  }
  if (!Array.isArray(settings.excludeSelectors)) {
    errors.push('excludeSelectors must be an array');
  }
  if (
    settings.overrides === null ||
    typeof settings.overrides !== 'object' ||
    Array.isArray(settings.overrides)
  ) {
    errors.push('overrides must be a plain object');
  }
  if (settings.ui) {
    if (
      typeof settings.ui.enabled !== 'undefined' &&
      typeof settings.ui.enabled !== 'boolean'
    ) {
      errors.push('ui.enabled must be a boolean');
    }
    if (
      settings.ui.fillMode &&
      !['widget', 'inline'].includes(settings.ui.fillMode)
    ) {
      errors.push('ui.fillMode must be "widget" or "inline"');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Map extension settings to FillKit.init() config.
 * Always sets provider: 'local', _source: 'extension',
 * and hides OptionsSheet.
 *
 * @param {Record<string, unknown>} settings
 * @returns {Record<string, unknown>}
 */
export function settingsToSdkConfig(settings) {
  const config = {
    mode: settings.mode || 'valid',
    locale: settings.locale || 'en',
    emailDomain: settings.emailDomain || 'example.com',
    provider: 'local',
    refill: settings.refill ?? true,
    watchMode: settings.watchMode ?? true,
    logLevel: settings.logLevel || 'error',
    _source: 'extension',
    ui: {
      enabled: settings.ui?.enabled ?? true,
      position: settings.ui?.position || 'bottom.center',
      fillMode: settings.ui?.fillMode || 'widget',
      mainWidgetVisible: settings.ui?.mainWidgetVisible ?? true,
      visibility: {
        optionsSheet: false,
      },
    },
    autofill: {
      includeOutsideForms: settings.includeOutsideForms ?? false,
      includeSelectors: settings.includeSelectors || [],
      excludeSelectors: settings.excludeSelectors || [],
      overrides: settings.overrides || {},
    },
  };

  if (settings.seed !== null && settings.seed !== undefined) {
    config.seed = settings.seed;
  }

  return config;
}

/**
 * Map extension settings to updateOptions() shape
 * plus a separate overrides object for direct atom update.
 *
 * @param {Record<string, unknown>} settings
 * @returns {{ updatePayload: Record<string, unknown>, overrides: Record<string, unknown> }}
 */
export function settingsToUpdatePayload(settings) {
  const updatePayload = {
    mode: settings.mode,
    locale: settings.locale,
    emailDomain: settings.emailDomain,
    seed: settings.seed ?? null,
    refill: settings.refill,
    watchMode: settings.watchMode,
    includeOutsideForms: settings.includeOutsideForms,
    ui: {
      enabled: settings.ui?.enabled ?? true,
      position: settings.ui?.position || 'bottom.center',
      fillMode: settings.ui?.fillMode || 'widget',
      mainWidgetVisible: settings.ui?.mainWidgetVisible ?? true,
    },
    autofill: {
      includeSelectors: settings.includeSelectors || [],
      excludeSelectors: settings.excludeSelectors || [],
    },
  };

  return {
    updatePayload,
    overrides: settings.overrides || {},
  };
}
