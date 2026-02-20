/**
 * Integrated Terminal styled like VS Code
 */
import * as fileExplorer from './file-explorer.js';

const { ipcRenderer } = require('electron');

const shellName = process.platform === 'win32' ? 'pwsh' : 'bash';

let terminalOutput = null;
let terminalInput = null;
let terminalTabTitle = null;
let terminalTabStatus = null;
let terminalClearBtn = null;
let terminalKillBtn = null;
let terminalRestartBtn = null;
let terminalNewBtn = null;
let terminalSplitBtn = null;

function appendOutput(text) {
  if (!terminalOutput) return;
  terminalOutput.textContent += text;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function clearOutput() {
  if (!terminalOutput) return;
  terminalOutput.textContent = '';
}

function updateTabTitle() {
  if (!terminalTabTitle) return;
  terminalTabTitle.textContent = shellName;
}

function updateTabStatus(text) {
  if (!terminalTabStatus) return;
  terminalTabStatus.textContent = text;
}

export async function spawnTerminal() {
  const cwd = fileExplorer.getWorkspacePath() || process.cwd?.() || '.';
  updateTabStatus('Starting...');
  await ipcRenderer.invoke('terminal-spawn', cwd);
  updateTabStatus('Running');
}

export function init() {
  terminalOutput = document.getElementById('terminal-output');
  terminalInput = document.getElementById('terminal-input');
  terminalTabTitle = document.getElementById('terminal-tab-title');
  terminalTabStatus = document.getElementById('terminal-tab-status');
  terminalClearBtn = document.getElementById('terminal-clear-btn');
  terminalKillBtn = document.getElementById('terminal-kill-btn');
  terminalRestartBtn = document.getElementById('terminal-restart-btn');
  terminalNewBtn = document.getElementById('terminal-new-btn');
  terminalSplitBtn = document.getElementById('terminal-split-btn');

  updateTabTitle();

  spawnTerminal();

  ipcRenderer.on('terminal-data', (_, data) => {
    appendOutput(data);
  });

  ipcRenderer.on('terminal-exit', (_, code) => {
    appendOutput(`\n[Process exited with code ${code}]\n`);
    updateTabStatus(code === 0 ? 'Exited' : `Exit ${code}`);
  });

  terminalInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = terminalInput.value;
      const trimmed = value.trim();
      if (trimmed) {
        ipcRenderer.invoke('terminal-write', value + '\n');
      } else {
        ipcRenderer.invoke('terminal-write', '\n');
      }
      terminalInput.value = '';
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearOutput();
    }
  });

  terminalClearBtn?.addEventListener('click', () => clearOutput());
  terminalKillBtn?.addEventListener('click', () => {
    ipcRenderer.invoke('terminal-kill');
    updateTabStatus('Killed');
  });
  terminalRestartBtn?.addEventListener('click', async () => {
    await ipcRenderer.invoke('terminal-kill');
    clearOutput();
    spawnTerminal();
  });
  const respawnTerminal = async () => {
    await ipcRenderer.invoke('terminal-kill');
    clearOutput();
    spawnTerminal();
  };
  terminalNewBtn?.addEventListener('click', respawnTerminal);
  terminalSplitBtn?.addEventListener('click', respawnTerminal);
}
