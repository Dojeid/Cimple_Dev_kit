/**
 * Integrated Terminal - Ctrl+`
 */
import { state } from './state.js';
import * as fileExplorer from './file-explorer.js';

const { ipcRenderer } = require('electron');

let terminalOutput = null;
let terminalInput = null;
let terminalReady = false;

export function init() {
  terminalOutput = document.getElementById('terminal-output');
  terminalInput = document.getElementById('terminal-input');

  spawnTerminal(); // Auto spawn on init

  ipcRenderer.on('terminal-data', (_, data) => {
    appendOutput(data);
  });

  ipcRenderer.on('terminal-exit', (_, code) => {
    appendOutput(`\n[Process exited with code ${code}]\n`);
  });

  if (terminalInput) {
    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = terminalInput.value.trim();
        if (input === 'clear' || input === 'cls') {
          terminalOutput.textContent = '';
          terminalInput.value = '';
          return;
        }
        const cmd = terminalInput.value + '\n';
        terminalInput.value = '';
        ipcRenderer.invoke('terminal-write', cmd);
      }
    });
  }
}

function appendOutput(text) {
  if (!terminalOutput) return;
  terminalOutput.textContent += text;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

export async function spawnTerminal() {
  const cwd = fileExplorer.getWorkspacePath() || process.cwd?.() || '.';
  await ipcRenderer.invoke('terminal-spawn', cwd);
  terminalReady = true;
  ipcRenderer.send('terminal-ready');
}

export function focusTerminal() {
  terminalInput?.focus();
}
