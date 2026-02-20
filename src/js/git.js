/**
 * Git / Source Control integration
 */
import { state } from './state.js';

const { ipcRenderer } = require('electron');

export async function refreshSourceList() {
  const listEl = document.getElementById('source-list');
  if (!listEl) return;
  const cwd = state.workspacePath;
  if (!cwd) {
    listEl.innerHTML = '<p class="source-hint">Open a folder to see changes.</p>';
    return;
  }
  try {
    const isRepo = await ipcRenderer.invoke('git-is-repo', cwd);
    if (!isRepo) {
      listEl.innerHTML = '<p class="source-hint">Not a Git repository.</p>';
      return;
    }
    const status = await ipcRenderer.invoke('git-status', cwd);
    const lines = (status || '').trim().split('\n').filter(Boolean);
    listEl.innerHTML = lines.length
      ? lines.map(line => {
          const mode = line.substring(0, 2);
          const file = line.substring(3).trim();
          const isNew = mode.includes('?') || mode.startsWith('A');
          const isModified = mode.includes('M') || mode.includes('D');
          const cls = isNew ? 'source-item-new' : (isModified ? 'source-item-modified' : '');
          return `<div class="source-item ${cls}">${escapeHtml(file)}</div>`;
        }).join('')
      : '<p class="source-hint">No changes.</p>';
  } catch {
    listEl.innerHTML = '<p class="source-hint">Error reading Git status.</p>';
  }
}

function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
