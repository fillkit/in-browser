/**
 * FillKit Welcome Page — opens the extension options page.
 */

var api = typeof browser !== 'undefined' ? browser : chrome;

document.getElementById('openOptions').addEventListener('click', function () {
  api.runtime.openOptionsPage();
});
