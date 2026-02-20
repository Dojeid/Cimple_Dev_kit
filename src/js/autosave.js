/**
 * Auto-save
 */
import { state } from './state.js';
import * as editor from './editor.js';
import * as fileExplorer from './file-explorer.js';
import { debounce } from './utils.js';

let saveTimeout = null;

function doSave() {
  const tab = editor.getActiveTab();
  if (!tab?.path || !tab.dirty) return;
  fileExplorer.saveFile(tab);
}

export function onContentChange() {
  if (!state.autoSaveEnabled) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(doSave, state.autoSaveDelay);
}

export function setEnabled(enabled) {
  state.autoSaveEnabled = enabled;
}
