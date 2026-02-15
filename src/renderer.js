const editor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const cursorPos = document.getElementById('cursor-pos');

// Update line numbers
const updateLineNumbers = () => {
    const lines = editor.value.split('\n');
    let numbers = '';
    for (let i = 1; i <= lines.length; i++) {
        numbers += i + '<br>';
    }
    lineNumbers.innerHTML = numbers;
};

// Handle Tab key
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;

        // Set textarea value to: text before caret + tab + text after caret
        editor.value = editor.value.substring(0, start) +
            "    " + editor.value.substring(end);

        // Put caret at right position again
        editor.selectionStart = editor.selectionEnd = start + 4;
        updateLineNumbers();
    }
});

// Sync scroll
editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
});

// Update position and numbers on input
editor.addEventListener('input', () => {
    updateLineNumbers();
    updateCursorInfo();
});

// Update cursor position info
const updateCursorInfo = () => {
    const textBefore = editor.value.substring(0, editor.selectionStart);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    cursorPos.innerText = `Ln ${line}, Col ${col}`;
};

editor.addEventListener('mouseup', updateCursorInfo);
editor.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        updateCursorInfo();
    }
});

// Initial call
updateLineNumbers();

// Proactively add some sample code
editor.value = `// Welcome to Cimple Edit
function greet() {
    console.log("Hello, World!");
}

greet();`;
updateLineNumbers();
updateCursorInfo();
