# editor.py
import tkinter as tk
from tkinter import ttk
from styles import THEME, KEYWORDS

class CodeEditor(ttk.Notebook):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self.open_tabs_data = {}

    def add_tab(self, content="", title="untitled", path=None):
        frame = tk.Frame(self, bg=THEME["bg"])
        
        # Add a scrollbar
        scrollbar = tk.Scrollbar(frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        text_area = tk.Text(frame, bg=THEME["bg"], fg=THEME["fg"], 
                            insertbackground="white", undo=True, 
                            font=("Consolas", 12), borderwidth=0, 
                            padx=10, pady=10, yscrollcommand=scrollbar.set)
        
        text_area.pack(fill="both", expand=True)
        scrollbar.config(command=text_area.yview)
        
        text_area.insert("1.0", content)
        self.add(frame, text=title)
        self.select(frame)
        
        # Map the frame ID to its data
        self.open_tabs_data[str(frame)] = {"path": path, "widget": text_area}
        
        # Highlighting trigger
        text_area.bind("<KeyRelease>", lambda e: self.apply_highlighting(text_area))
        self.apply_highlighting(text_area)
        
        return frame

    def apply_highlighting(self, widget):
        for tag in ["kw", "str"]:
            widget.tag_remove(tag, "1.0", "end")
        
        content = widget.get("1.0", "end")
        for kw in KEYWORDS:
            start = "1.0"
            while True:
                pos = widget.search(rf"\y{kw}\y", start, stopindex="end", regexp=True)
                if not pos: break
                end = f"{pos}+{len(kw)}c"
                widget.tag_add("kw", pos, end)
                start = end
        
        widget.tag_config("kw", foreground=THEME["keyword"], font=("Consolas", 12, "bold"))