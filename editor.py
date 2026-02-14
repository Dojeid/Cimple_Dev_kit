# editor.py
import tkinter as tk
from tkinter import ttk
import re
from styles import THEME, KEYWORDS

class NumberedText(tk.Frame):
    def __init__(self, master, **kwargs):
        super().__init__(master)
        self.text = tk.Text(self, **kwargs)
        self.linenumbers = tk.Text(self, width=4, padx=5, bg=THEME["sidebar"], fg="#858585",
                                   state="disabled", font=("Consolas", 12))

        self.linenumbers.pack(side=tk.LEFT, fill=tk.Y)
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        self.text.config(yscrollcommand=self._on_scroll)
        self.linenumbers.config(yscrollcommand=self._on_scroll)  # sync

        self.text.bind("<KeyRelease>", self._update_line_numbers)
        self.text.bind("<Configure>", self._update_line_numbers)

    def _on_scroll(self, *args):
        self.linenumbers.yview_moveto(args[0])
        self.text.yview_moveto(args[0])

    def _update_line_numbers(self, *args):
        self.linenumbers.config(state="normal")
        self.linenumbers.delete("1.0", "end")
        line_count = int(self.text.index("end-1c").split(".")[0])
        self.linenumbers.insert("1.0", "\n".join(str(i) for i in range(1, line_count + 1)))
        self.linenumbers.config(state="disabled")


class CodeEditor(ttk.Notebook):
    def __init__(self, master, status_callback=None):
        super().__init__(master)
        self.open_tabs_data = {}
        self.status_callback = status_callback

    def add_tab(self, content="", title="untitled.cimp", path=None):
        frame = tk.Frame(self, bg=THEME["bg"])

        editor = NumberedText(frame,
                              bg=THEME["bg"], fg=THEME["fg"],
                              insertbackground="white", undo=True,
                              font=("Consolas", 12), borderwidth=0,
                              padx=10, pady=10, wrap="none")

        editor.pack(fill="both", expand=True)
        editor.text.insert("1.0", content)

        self.add(frame, text=title)
        self.select(frame)

        tab_id = str(frame)
        self.open_tabs_data[tab_id] = {"path": path, "widget": editor.text, "frame": frame}

        # Highlighting & status
        editor.text.bind("<KeyRelease>", lambda e: self._on_text_change(editor.text, tab_id))
        self._apply_highlighting(editor.text)
        self._on_text_change(editor.text, tab_id)  # initial status

        return frame

    def _on_text_change(self, widget, tab_id):
        if self.status_callback:
            line, col = widget.index("insert").split(".")
            self.status_callback(int(line), int(col))

        self._apply_highlighting(widget)

    def _apply_highlighting(self, widget):
        for tag in ["kw", "str", "comment", "number", "bool"]:
            widget.tag_remove(tag, "1.0", "end")

        content = widget.get("1.0", "end")

        # Keywords
        for kw in KEYWORDS:
            for m in re.finditer(rf"\b{kw}\b", content):
                start = f"1.0 + {m.start()} chars"
                end = f"1.0 + {m.end()} chars"
                widget.tag_add("kw", start, end)

        # Strings
        for m in re.finditer(r'(".*?"|\'.*?\')', content):
            start = f"1.0 + {m.start()} chars"
            end = f"1.0 + {m.end()} chars"
            widget.tag_add("str", start, end)

        # Comments (// and #)
        for m in re.finditer(r'(//|#).*$', content, re.MULTILINE):
            start = f"1.0 + {m.start()} chars"
            end = f"1.0 + {m.end()} chars"
            widget.tag_add("comment", start, end)

        # Numbers
        for m in re.finditer(r'\b\d+\b', content):
            start = f"1.0 + {m.start()} chars"
            end = f"1.0 + {m.end()} chars"
            widget.tag_add("number", start, end)

        # Booleans
        for m in re.finditer(r'\b(true|false)\b', content, re.IGNORECASE):
            start = f"1.0 + {m.start()} chars"
            end = f"1.0 + {m.end()} chars"
            widget.tag_add("bool", start, end)

        # Tag styles
        widget.tag_config("kw", foreground=THEME["keyword"], font=("Consolas", 12, "bold"))
        widget.tag_config("str", foreground=THEME["string"])
        widget.tag_config("comment", foreground=THEME["comment"], font=("Consolas", 12, "italic"))
        widget.tag_config("number", foreground="#b5cea8")
        widget.tag_config("bool", foreground=THEME["keyword"])