/**
 * Panels - Activity bar, sidebar, bottom panel
 */
import { state } from './state.js';
import * as fileExplorer from './file-explorer.js';
import * as editor from './editor.js';
import * as git from './git.js';

export function init() {
  const sidebar = document.getElementById('primary-sidebar');
  const sidebarTitle = document.getElementById('sidebar-title');
  const panel = document.getElementById('bottom-panel');
  const panelTabs = document.getElementById('panel-tabs');
  const resizer = document.getElementById('sidebar-resizer');

  // Activity bar views
  document.querySelectorAll('.activity-item').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      state.sidebarView = view;
      document.querySelectorAll('.activity-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.sidebar-view').forEach(x => x.classList.remove('active'));
      const panelEl = document.getElementById(view + '-view');
      if (panelEl) panelEl.classList.add('active');
      const titles = { explorer: 'EXPLORER', search: 'SEARCH', run: 'RUN', source: 'SOURCE CONTROL', extensions: 'EXTENSIONS' };
      if (sidebarTitle) sidebarTitle.textContent = titles[view] || 'EXPLORER';
      if (view === 'source') git.refreshSourceList();
    });
  });

  // Sidebar actions
  const newFileBtn = document.getElementById('new-file-btn');
  const openFolderBtn = document.getElementById('open-folder-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  if (newFileBtn) newFileBtn.addEventListener('click', () => editor.addTab());
  if (openFolderBtn) openFolderBtn.addEventListener('click', () => fileExplorer.openFolder());
  if (refreshBtn) refreshBtn.addEventListener('click', () => {
    if (state.workspacePath) fileExplorer.refreshFolder();
  });

  // Bottom panel tabs
  if (panelTabs) {
    panelTabs.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        state.panelTab = tab.dataset.tab;
        panelTabs.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
        const v = document.getElementById('panel-' + state.panelTab);
        if (v) v.classList.add('active');
      });
    });
  }

  // Sidebar resizer
  if (resizer && sidebar) {
    let resizing = false;
    resizer.addEventListener('mousedown', () => { resizing = true; resizer.classList.add('active'); });
    document.addEventListener('mouseup', () => { resizing = false; resizer.classList.remove('active'); });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const w = e.clientX - 48;
      if (w >= 180 && w <= 500) {
        sidebar.style.width = w + 'px';
        state.sidebarWidth = w;
      }
    });
  }

  // Panel resizer
  const panelResizer = document.getElementById('panel-resizer');
  if (panelResizer && panel) {
    let resizing = false;
    panelResizer.addEventListener('mousedown', () => { resizing = true; });
    document.addEventListener('mouseup', () => { resizing = false; });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const h = window.innerHeight - e.clientY;
      if (h >= 80 && h <= 500) {
        panel.style.height = h + 'px';
        state.panelHeight = h;
      }
    });
  }
}
