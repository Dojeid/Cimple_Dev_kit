# main.py
import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from styles import THEME
from editor import CodeEditor
from sidebar import FileExplorer
from terminal import InteractiveTerminal
from compiler_utils import run_cimple_code

class CimpleDevKit:
    def __init__(self, root):
        self.root = root
        self.root.title("CIMPLE DevKit Pro")
        self.root.geometry("1200x750")
        self.root.configure(bg=THEME["bg"])

        self.current_file = None
        self.setup_menu()
        self.setup_ui()

    def setup_menu(self):
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="New File", command=self.new_file, accelerator="Ctrl+N")
        file_menu.add_command(label="Open Folder", command=self.open_folder, accelerator="Ctrl+O")
        file_menu.add_command(label="Save", command=self.save_file, accelerator="Ctrl+S")
        file_menu.add_command(label="Save As...", command=self.save_as)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)
        menubar.add_cascade(label="File", menu=file_menu)

        run_menu = tk.Menu(menubar, tearoff=0)
        run_menu.add_command(label="Run", command=self.run_code, accelerator="Ctrl+R")
        menubar.add_cascade(label="Run", menu=run_menu)

    def setup_ui(self):
        # Toolbar
        toolbar = tk.Frame(self.root, bg=THEME["sidebar"], height=45)
        toolbar.pack(fill=tk.X, side=tk.TOP)

        for text, cmd, color in [
            ("📄 New", self.new_file, None),
            ("📁 Open", self.open_folder, None),
            ("💾 Save", self.save_file, None),
            ("▶ Run", self.run_code, "#28a745"),
            ("🗑 Clear Terminal", self.clear_terminal, "#dc3545")
        ]:
            btn = tk.Button(toolbar, text=text, command=cmd, bg=color or THEME["sidebar"],
                            fg="white", relief="flat", padx=12, font=("Segoe UI", 10))
            btn.pack(side=tk.LEFT, padx=4, pady=6)

        # Main layout
        self.main_pane = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, sashwidth=6, bg=THEME["bg"])
        self.main_pane.pack(fill=tk.BOTH, expand=True)

        self.explorer = FileExplorer(self.main_pane, self.open_file)
        self.main_pane.add(self.explorer, width=280)

        right = tk.Frame(self.main_pane, bg=THEME["bg"])
        self.main_pane.add(right)

        self.vert_pane = tk.PanedWindow(right, orient=tk.VERTICAL, sashwidth=6, bg=THEME["bg"])
        self.vert_pane.pack(fill=tk.BOTH, expand=True)

        self.editor = CodeEditor(self.vert_pane, status_callback=self.update_status)
        self.vert_pane.add(self.editor, height=500)

        self.terminal = InteractiveTerminal(self.vert_pane)
        self.vert_pane.add(self.terminal, height=220)

        # Status bar
        self.status_bar = tk.Label(self.root, text=" Ready | Ln 1, Col 1", bg=THEME["accent"],
                                   fg="white", anchor="w", font=("Segoe UI", 9))
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)

        # Keyboard shortcuts
        self.root.bind("<Control-n>", lambda e: self.new_file())
        self.root.bind("<Control-o>", lambda e: self.open_folder())
        self.root.bind("<Control-s>", lambda e: self.save_file())
        self.root.bind("<Control-r>", lambda e: self.run_code())

    def update_status(self, line, col):
        self.status_bar.config(text=f" Ln {line}, Col {col} | {self.current_file or 'Untitled'}")

    def new_file(self):
        self.editor.add_tab(title="untitled.cimp")

    def open_folder(self):
        path = filedialog.askdirectory()
        if path:
            self.explorer.load_directory(path)
            self.terminal.set_cwd(path)

    def open_file(self, path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            self.editor.add_tab(content, os.path.basename(path), path)
            self.current_file = path
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def save_file(self):
        # ... (same as before but smarter)
        curr = self.editor.select()
        if not curr: return
        data = self.editor.open_tabs_data.get(str(curr))
        if not data: return

        if not data["path"]:
            path = filedialog.asksaveasfilename(defaultextension=".cimp", filetypes=[("CIMPLE", "*.cimp")])
            if not path: return
            data["path"] = path
            self.editor.tab("current", text=os.path.basename(path))

        content = data["widget"].get("1.0", "end-1c")
        with open(data["path"], "w", encoding="utf-8") as f:
            f.write(content)

        self.current_file = data["path"]
        self.status_bar.config(text=f" Saved: {os.path.basename(data['path'])}")

    def save_as(self):
        curr = self.editor.select()
        if not curr: return
        data = self.editor.open_tabs_data.get(str(curr))
        if not data: return

        path = filedialog.asksaveasfilename(defaultextension=".cimp", filetypes=[("CIMPLE", "*.cimp")])
        if not path: return

        data["path"] = path
        self.editor.tab("current", text=os.path.basename(path))

        content = data["widget"].get("1.0", "end-1c")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

        self.current_file = path
        self.status_bar.config(text=f" Saved: {os.path.basename(path)}")

    def run_code(self):
        curr = self.editor.select()
        if not curr: return
        data = self.editor.open_tabs_data.get(str(curr))
        if not data: return

        if not data["path"] or data["widget"].edit_modified():
            self.save_file()
            data = self.editor.open_tabs_data.get(str(curr))  # refresh

        if not data["path"]:
            return

        run_cimple_code(data["path"], self.terminal, self.root, data["widget"])

    def clear_terminal(self):
        self.terminal.clear()

if __name__ == "__main__":
    root = tk.Tk()
    app = CimpleDevKit(root)
    root.mainloop()