/**
 * Run panel - Execute Cimple program
 */
import { state } from './state.js';
import * as editor from './editor.js';
import * as fileExplorer from './file-explorer.js';

const { ipcRenderer } = require('electron');

const runOutput = document.getElementById('run-output');
const runBtn = document.getElementById('run-btn');

export function init() {
  if (runBtn) runBtn.disabled = false;
  ipcRenderer.on('run-output', (_, data) => {
    const output = document.getElementById('output-log') || document.getElementById('run-output');
    if (output) {
      output.textContent += data;
      output.scrollTop = output.scrollHeight;
    }
  });

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const tab = editor.getActiveTab();
      const output = document.getElementById('output-log');
      const panelTabs = document.getElementById('panel-tabs');
      if (panelTabs) {
        panelTabs.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        const outputTab = panelTabs.querySelector('.panel-tab[data-tab="output"]');
        if (outputTab) { outputTab.classList.add('active'); }
        document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
        const outView = document.getElementById('panel-output');
        if (outView) outView.classList.add('active');
      }
      if (output) output.textContent = 'Running...\n';
      const filePath = tab?.path;
      const content = tab?.content;
      const cwd = fileExplorer.getWorkspacePath() || (filePath ? filePath.replace(/[/\\][^/\\]+$/, '') : null);
      try {
        if (filePath) {
          await ipcRenderer.invoke('run-cimple', filePath, cwd);
        } else {
          // Unsaved file - write to temp and run
          const { writeFile, unlink } = require('fs').promises;
          const { join } = require('path');
          const tmpPath = join(require('os').tmpdir(), 'cimple_run_' + Date.now() + '.cimple');
          await writeFile(tmpPath, content || '', 'utf8');
          try {
            await ipcRenderer.invoke('run-cimple', tmpPath, cwd);
          } finally {
            await unlink(tmpPath).catch(() => {});
          }
        }
      } catch (err) {
        const out = document.getElementById('output-log');
        if (out) out.textContent += '\n' + String(err);
      }
    });
  }
}
