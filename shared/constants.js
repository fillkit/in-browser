/**
 * Shared constants for FillKit browser extensions
 */

/** Message types for extension messaging */
export const MSG = {
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  OPEN_OPTIONS_PAGE: 'OPEN_OPTIONS_PAGE',
  PING: 'PING',
  GET_STATUS: 'GET_STATUS',
};

/** Chrome storage key for settings */
export const STORAGE_KEY = 'fillkit_settings';

/** Widget position presets */
export const POSITION_PRESETS = [
  { value: 'bottom.center', label: 'Bottom Center' },
  { value: 'top.center', label: 'Top Center' },
  { value: 'bottom.left', label: 'Bottom Left' },
  { value: 'bottom.right', label: 'Bottom Right' },
  { value: 'left.center', label: 'Left Center' },
  { value: 'right.center', label: 'Right Center' },
];

/** Log level options */
export const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug'];

/** Fill mode options */
export const FILL_MODES = ['widget', 'inline'];
