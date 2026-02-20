/**
 * Cimple Edit - Full-featured code editor for Cimple language (Python-like syntax)
 * Designed to be wired to the Cimple compiler via Electron.
 */

// ========== Cimple syntax highlighter (Python-like) ==========
const CIMPLE_KEYWORDS = new Set([
    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'in', 'return', 'yield',
    'break', 'continue', 'pass', 'raise', 'try', 'except', 'finally', 'with', 'as',
    'import', 'from', 'and', 'or', 'not', 'True', 'False', 'None', 'lambda', 'assert',
    'global', 'nonlocal', 'del', 'match', 'case'
]);

const CIMPLE_BUILTINS = new Set([
    'print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set',
    'tuple', 'input', 'open', 'type', 'isinstance', 'enumerate', 'zip', 'map',
    'filter', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed', 'iter', 'next'
]);

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightCimple(source) {
    if (!source) return '';
    const lines = source.split('\n');
    const out = [];
    for (const line of lines) {
        out.push(highlightLine(line));
    }
    return out.join('\n');
}

function highlightLine(line) {
    let result = '';
    let i = 0;
    const n = line.length;

    while (i < n) {
        // Triple-quoted string (""" or ''')
        if ((line.substr(i, 3) === '"""' || line.substr(i, 3) === "'''")) {
            const q = line.substr(i, 3);
            let end = line.indexOf(q, i + 3);
            if (end === -1) end = n;
            else end += 3;
            const chunk = escapeHtml(line.slice(i, end));
            result += `<span class="hl-string">${chunk}</span>`;
            i = end;
            continue;
        }
        // Single-line string " or '
        if (line[i] === '"' || line[i] === "'") {
            const q = line[i];
            let end = i + 1;
            while (end < n && (line[end] !== q || line[end - 1] === '\\')) end++;
            if (end < n) end++;
            const chunk = escapeHtml(line.slice(i, end));
            result += `<span class="hl-string">${chunk}</span>`;
            i = end;
            continue;
        }
        // Comment
        if (line[i] === '#') {
            const chunk = escapeHtml(line.slice(i));
            result += `<span class="hl-comment">${chunk}</span>`;
            break;
        }
        // Number
        if (/[0-9.]/.test(line[i]) && (i === 0 || /[\s(\[{,=:]/.test(line[i - 1]))) {
            let end = i;
            while (end < n && /[0-9.xXa-fA-F_]/.test(line[end])) end++;
            if (line[end] === '.' && end + 1 < n && /[0-9]/.test(line[end + 1])) {
                end++;
                while (end < n && /[0-9eE+-]/.test(line[end])) end++;
            }
            const chunk = escapeHtml(line.slice(i, end));
            result += `<span class="hl-number">${chunk}</span>`;
            i = end;
            continue;
        }
        // Word (identifier / keyword / builtin)
        if (/[a-zA-Z_]/.test(line[i])) {
            let end = i;
            while (end < n && /[a-zA-Z0-9_]/.test(line[end])) end++;
            const word = line.slice(i, end);
            const escaped = escapeHtml(word);
            if (CIMPLE_KEYWORDS.has(word)) {
                result += `<span class="hl-keyword">${escaped}</span>`;
            } else if (CIMPLE_BUILTINS.has(word)) {
                result += `<span class="hl-builtin">${escaped}</span>`;
            } else if (word === 'def' || word === 'class') {
                result += `<span class="hl-keyword">${escaped}</span>`;
            } else {
                result += escaped;
            }
            i = end;
            continue;
        }
        // Operator / other
        if (/[+\-*\/%=<>!&|^~@]/.test(line[i])) {
            const chunk = escapeHtml(line[i]);
            result += `<span class="hl-operator">${chunk}</span>`;
            i++;
            continue;
        }
        result += escapeHtml(line[i]);
        i++;
    }
    return result;
}

// ========== Editor state ==========
const state = {
    tabs: [{ id: 'default', title: 'Untitled-1', dirty: false, content: '' }],
    activeTabId: 'default',
    sidebarView: 'explorer',
    sidebarWidth: 260,
    findWidgetVisible: false,
    findMatches: [],
    currentFindIndex: -1
};

const editor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const highlightLayer = document.getElementById('highlight-layer');
const cursorPos = document.getElementById('cursor-pos');
const selectionInfo = document.getElementById('selection-info');
const tabsContainer = document.getElementById('tabs-container');
const primarySidebar = document.getElementById('primary-sidebar');
const sidebarTitle = document.getElementById('sidebar-title');
const findWidget = document.getElementById('find-widget');
const contextMenu = document.getElementById('context-menu');

// ========== Line numbers ==========
function updateLineNumbers() {
    const text = getActiveContent();
    const lines = text.split('\n');
    const count = Math.max(1, lines.length);
    lineNumbers.innerHTML = Array.from({ length: count }, (_, i) => i + 1).join('<br>');
}

// ========== Syntax highlighting ==========
function updateHighlight() {
    const text = getActiveContent();
    highlightLayer.innerHTML = highlightCimple(text).replace(/\n/g, '<br>');
}

// ========== Cursor & selection ==========
function updateCursorInfo() {
    const text = getActiveContent();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const textBefore = text.substring(0, start);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    cursorPos.textContent = `Ln ${line}, Col ${col}`;

    if (start !== end) {
        const selLines = text.substring(start, end).split('\n');
        selectionInfo.style.display = 'inline';
        selectionInfo.textContent = selLines.length > 1
            ? `${selLines.length} lines selected`
            : `${end - start} selected`;
    } else {
        selectionInfo.style.display = 'none';
    }
}

// ========== Tab helpers ==========
function getActiveTabId() {
    return state.activeTabId;
}

function getActiveContent() {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    return tab ? tab.content : editor.value;
}

function setActiveContent(value) {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (tab) {
        tab.content = value;
        tab.dirty = true;
        updateTabDirty(tab.id);
    }
    updateLineNumbers();
    updateHighlight();
    updateCursorInfo();
}

function updateTabDirty(tabId) {
    const tabEl = tabsContainer.querySelector(`.tab[data-id="${tabId}"]`);
    if (!tabEl) return;
    const tab = state.tabs.find(t => t.id === tabId);
    const dirtyEl = tabEl.querySelector('.tab-dirty');
    if (dirtyEl) dirtyEl.style.display = tab && tab.dirty ? 'inline' : 'none';
}

// ========== Sync editor with active tab ==========
function editorFromTab() {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    const content = tab ? tab.content : '';
    editor.value = content;
    updateLineNumbers();
    updateHighlight();
    updateCursorInfo();
}

function tabFromEditor() {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (tab) tab.content = editor.value;
}

// ========== Tabs UI ==========
function renderTabs() {
    tabsContainer.innerHTML = state.tabs.map(t => `
        <div class="tab ${t.id === state.activeTabId ? 'active' : ''}" data-id="${t.id}">
            <span class="tab-icon">cimple</span>
            <span class="tab-title">${escapeHtml(t.title)}</span>
            <span class="tab-dirty" style="display: ${t.dirty ? 'inline' : 'none'}">●</span>
            <span class="tab-close">×</span>
        </div>
    `).join('');

    tabsContainer.querySelectorAll('.tab').forEach(el => {
        const id = el.dataset.id;
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-close')) {
                closeTab(id);
            } else {
                switchTab(id);
            }
        });
    });
}

function switchTab(id) {
    if (id === state.activeTabId) return;
    tabFromEditor();
    state.activeTabId = id;
    renderTabs();
    editorFromTab();
}

function closeTab(id) {
    const idx = state.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    tabFromEditor();
    state.tabs.splice(idx, 1);
    if (state.tabs.length === 0) {
        state.tabs.push({ id: 'default', title: 'Untitled-1', dirty: false, content: '' });
        state.activeTabId = 'default';
    } else if (state.activeTabId === id) {
        state.activeTabId = state.tabs[Math.max(0, idx - 1)].id;
    }
    renderTabs();
    editorFromTab();
}

function addTab(title = null) {
    tabFromEditor();
    const num = state.tabs.length + 1;
    const id = 'tab-' + Date.now();
    const title_ = title || `Untitled-${num}`;
    state.tabs.push({ id, title: title_, dirty: false, content: '' });
    state.activeTabId = id;
    renderTabs();
    editorFromTab();
}

// ========== Activity bar & sidebar views ==========
document.querySelectorAll('.activity-item').forEach(el => {
    el.addEventListener('click', () => {
        const view = el.dataset.view;
        state.sidebarView = view;
        document.querySelectorAll('.activity-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        document.querySelectorAll('.sidebar-view').forEach(x => x.classList.remove('active'));
        const panel = document.getElementById(view + '-view');
        if (panel) panel.classList.add('active');
        const titles = { explorer: 'EXPLORER', search: 'SEARCH', run: 'RUN' };
        sidebarTitle.textContent = titles[view] || 'EXPLORER';
    });
});

// ========== Find in editor ==========
function getFindRegex() {
    const findInput = document.getElementById('editor-find-input');
    const caseSensitive = document.getElementById('find-case')?.checked ?? false;
    const useRegex = document.getElementById('find-regex')?.checked ?? false;
    const wholeWord = document.getElementById('find-whole')?.checked ?? false;
    let pattern = (findInput && findInput.value) || '';
    if (!pattern && useRegex) return null;
    if (!useRegex) pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord) pattern = '\\b' + pattern + '\\b';
    const flags = 'g' + (caseSensitive ? '' : 'i');
    try {
        return new RegExp(pattern, flags);
    } catch (_) {
        return null;
    }
}

function findInEditor(forward = true) {
    const regex = getFindRegex();
    const text = getActiveContent();
    if (!regex) return;
    const matches = [];
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(text)) !== null) matches.push({ start: m.index, end: m.index + m[0].length });
    state.findMatches = matches;
    const cursor = editor.selectionStart;
    let idx = forward
        ? matches.findIndex(m => m.start >= (editor.selectionEnd || cursor))
        : [...matches].reverse().findIndex(m => m.end <= cursor);
    if (forward && idx === -1) idx = 0;
    if (!forward && idx === -1) idx = matches.length - 1;
    if (!forward && matches.length) idx = matches.length - 1 - idx;
    state.currentFindIndex = matches.length ? Math.max(0, idx) : -1;
    const countEl = document.getElementById('editor-find-count');
    countEl.textContent = matches.length ? `${state.currentFindIndex + 1}/${matches.length}` : '0/0';
    if (matches.length && state.currentFindIndex >= 0) {
        const { start, end } = matches[state.currentFindIndex];
        editor.focus();
        editor.setSelectionRange(start, end);
        updateCursorInfo();
    }
}

function replaceInEditor(oneOnly) {
    const replaceInput = document.getElementById('editor-replace-input');
    const replaceValue = (replaceInput && replaceInput.value) || '';
    const text = getActiveContent();
    const regex = getFindRegex();
    if (!regex) return;
    if (oneOnly && state.findMatches.length && state.currentFindIndex >= 0) {
        const { start, end } = state.findMatches[state.currentFindIndex];
        const newText = text.slice(0, start) + replaceValue + text.slice(end);
        setActiveContent(newText);
        editor.value = newText;
        editor.setSelectionRange(start, start + replaceValue.length);
        findInEditor(true);
        return;
    }
    const newText = text.replace(regex, replaceValue);
    setActiveContent(newText);
    editor.value = newText;
    const countEl = document.getElementById('editor-find-count');
    countEl.textContent = '0/0';
    state.findMatches = [];
    state.currentFindIndex = -1;
}

document.getElementById('editor-find-input').addEventListener('input', () => findInEditor(true));
document.getElementById('editor-find-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') findInEditor(!e.shiftKey);
    if (e.key === 'Escape') hideFindWidget();
});
document.getElementById('editor-find-next').addEventListener('click', () => findInEditor(true));
document.getElementById('editor-find-prev').addEventListener('click', () => findInEditor(false));
document.getElementById('editor-find-close').addEventListener('click', hideFindWidget);
document.getElementById('editor-replace-one').addEventListener('click', () => replaceInEditor(true));
document.getElementById('editor-replace-all').addEventListener('click', () => replaceInEditor(false));

function showFindWidget() {
    findWidget.classList.add('visible');
    document.getElementById('editor-find-input').focus();
    findInEditor(true);
}

function hideFindWidget() {
    findWidget.classList.remove('visible');
    editor.focus();
}

// ========== Keyboard ==========
editor.addEventListener('keydown', (e) => {
    // Tab
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = getActiveContent();
        if (e.shiftKey) {
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const line = value.slice(lineStart, end);
            const indent = line.match(/^(\s*)/)[1];
            if (indent.length >= 4) {
                const newContent = value.slice(0, lineStart) + indent.slice(4) + value.slice(lineStart + 4);
                setActiveContent(newContent);
                editor.value = newContent;
                editor.setSelectionRange(Math.max(lineStart, start - 4), end - 4);
            }
        } else {
            const inserted = '    ';
            const newContent = value.substring(0, start) + inserted + value.substring(end);
            setActiveContent(newContent);
            editor.value = newContent;
            editor.selectionStart = editor.selectionEnd = start + inserted.length;
        }
        updateLineNumbers();
        updateHighlight();
        return;
    }

    // Find
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        showFindWidget();
        return;
    }
    if (e.key === 'Escape') {
        hideFindWidget();
    }
});

editor.addEventListener('input', () => {
    setActiveContent(editor.value);
});

editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
    highlightLayer.scrollTop = editor.scrollTop;
    highlightLayer.scrollLeft = editor.scrollLeft;
});

editor.addEventListener('mouseup', updateCursorInfo);
editor.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        updateCursorInfo();
    }
});

// Global shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        // TODO: wire to Electron save
    }
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        addTab();
    }
    if (e.ctrlKey && e.key === 'f' && document.activeElement !== editor) {
        e.preventDefault();
        document.querySelector('.activity-item[data-view="search"]').click();
        document.getElementById('find-input').focus();
    }
});

// ========== Context menu ==========
editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenu.classList.add('visible');
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
});

document.addEventListener('click', () => contextMenu.classList.remove('visible'));

contextMenu.querySelectorAll('.context-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        editor.focus();
        if (action === 'cut') document.execCommand('cut');
        if (action === 'copy') document.execCommand('copy');
        if (action === 'paste') document.execCommand('paste');
        if (action === 'selectAll') {
            editor.setSelectionRange(0, editor.value.length);
            updateCursorInfo();
        }
        contextMenu.classList.remove('visible');
    });
});

// ========== Sidebar buttons ==========
document.getElementById('new-file-btn').addEventListener('click', () => addTab());
document.getElementById('open-folder-btn').addEventListener('click', () => {
    // Placeholder: in Electron you would use dialog.showOpenDialog
    console.log('Open folder – wire to Electron dialog');
});
document.getElementById('run-btn').addEventListener('click', () => {
    // Placeholder: run Cimple compiler
    console.log('Run – wire to Cimple compiler in Electron');
});

// Sidebar search panel → apply to editor
const sidebarFindInput = document.getElementById('find-input');
const sidebarReplaceInput = document.getElementById('replace-input');
if (sidebarFindInput) {
    sidebarFindInput.addEventListener('input', () => {
        const regex = getFindRegexSidebar();
        const text = getActiveContent();
        if (!regex || !sidebarFindInput.value) {
            document.getElementById('find-count').textContent = '';
            return;
        }
        const matches = text.match(regex);
        document.getElementById('find-count').textContent = matches ? matches.length + ' matches' : '0';
    });
}
function getFindRegexSidebar() {
    const pattern = (document.getElementById('find-input') && document.getElementById('find-input').value) || '';
    const caseSensitive = document.getElementById('find-case') && document.getElementById('find-case').checked;
    const useRegex = document.getElementById('find-regex') && document.getElementById('find-regex').checked;
    const wholeWord = document.getElementById('find-whole') && document.getElementById('find-whole').checked;
    let p = pattern;
    if (!useRegex) p = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (wholeWord) p = '\\b' + p + '\\b';
    try {
        return new RegExp(p, 'g' + (caseSensitive ? '' : 'i'));
    } catch (_) {
        return null;
    }
}
function findNextInEditor(fromSidebar) {
    const regex = getFindRegexSidebar();
    if (!regex) return;
    const text = getActiveContent();
    regex.lastIndex = editor.selectionEnd || 0;
    const m = regex.exec(text);
    if (m) {
        editor.setSelectionRange(m.index, m.index + m[0].length);
        editor.focus();
        updateCursorInfo();
    }
}
function replaceAllFromSidebar() {
    const regex = getFindRegexSidebar();
    const replaceInput = document.getElementById('replace-input');
    const replaceValue = (replaceInput && replaceInput.value) || '';
    if (!regex) return;
    const text = getActiveContent();
    const newText = text.replace(regex, replaceValue);
    setActiveContent(newText);
    editor.value = newText;
    document.getElementById('find-count').textContent = '0';
}
document.getElementById('replace-next').addEventListener('click', () => findNextInEditor(true));
document.getElementById('replace-prev').addEventListener('click', () => {
    const regex = getFindRegexSidebar();
    if (!regex) return;
    const text = getActiveContent();
    const cursor = editor.selectionStart;
    const before = text.slice(0, cursor);
    const matches = [...before.matchAll(new RegExp(regex.source, regex.flags))];
    const last = matches[matches.length - 1];
    if (last) {
        editor.setSelectionRange(last.index, last.index + last[0].length);
        editor.focus();
        updateCursorInfo();
    }
});
document.getElementById('replace-one').addEventListener('click', () => {
    const regex = getFindRegexSidebar();
    const replaceInput = document.getElementById('replace-input');
    const replaceValue = (replaceInput && replaceInput.value) || '';
    if (!regex) return;
    let text = getActiveContent();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const sel = text.slice(start, end);
    if (sel && new RegExp('^(' + regex.source + ')$', regex.flags).test(sel)) {
        text = text.slice(0, start) + replaceValue + text.slice(end);
        setActiveContent(text);
        editor.value = text;
        editor.setSelectionRange(start, start + replaceValue.length);
    }
    findNextInEditor(true);
    const countEl = document.getElementById('find-count');
    const r = getFindRegexSidebar();
    if (r) countEl.textContent = (getActiveContent().match(r) || []).length + ' matches';
});
document.getElementById('replace-all').addEventListener('click', replaceAllFromSidebar);

// ========== Sidebar resizer ==========
const resizer = document.getElementById('sidebar-resizer');
let resizing = false;
resizer.addEventListener('mousedown', () => { resizing = true; resizer.classList.add('active'); });
document.addEventListener('mouseup', () => { resizing = false; resizer.classList.remove('active'); });
document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const w = e.clientX - 48;
    if (w >= 180 && w <= 500) {
        primarySidebar.style.width = w + 'px';
        state.sidebarWidth = w;
    }
});

// ========== Init ==========
const defaultCode = `# Welcome to Cimple (Python-like syntax)
def greet(name):
    print("Hello, " + name)

x = 10
if x > 0:
    greet("World")
`;
state.tabs[0].content = defaultCode;
state.tabs[0].dirty = false;
renderTabs();
editorFromTab();
