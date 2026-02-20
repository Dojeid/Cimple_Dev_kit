/**
 * Minimap - High-level file overview
 */
import { state } from './state.js';
import * as editor from './editor.js';

const minimapEl = document.getElementById('minimap');
const editorEl = document.getElementById('code-editor');
const highlightLayer = document.getElementById('highlight-layer');

let updateTimeout = null;

export function update() {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(performUpdate, 150);
}

function performUpdate() {
  if (!minimapEl || !highlightLayer) return;
  const text = editor.getActiveContent();
  const lines = text.split('\n');

  // Cap the number of lines in the minimap to prevent extreme memory usage
  const displayLines = lines.slice(0, 1000);
  const maxLen = 100; // Fixed max width for performance

  let html = '';
  for (let i = 0; i < displayLines.length; i++) {
    const line = displayLines[i];
    const width = Math.min((line.length / maxLen) * 100, 100);
    html += `<div class="minimap-line" style="width: ${width}%" data-line="${i + 1}"></div>`;
  }
  minimapEl.innerHTML = html;
}

export function init() {
  if (!minimapEl || !editorEl) return;
  minimapEl.addEventListener('click', (e) => {
    const line = e.target?.dataset?.line;
    if (!line) return;
    const lineNum = parseInt(line, 10);
    const text = editor.getActiveContent();
    const idx = text.split('\n').slice(0, lineNum - 1).join('\n').length;
    editorEl.focus();
    editorEl.setSelectionRange(idx, idx);
    editorEl.scrollTop = (lineNum - 5) * 25.6;
  });
}
