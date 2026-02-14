# main.py
import os
import tkinter as tk
from tkinter import filedialog, messagebox
from styles import THEME
from editor import CodeEditor
from sidebar import FileExplorer
from compiler_utils import run_cimple_code

class CimpleDevKit:
    def __init__(self, root):
        self.root = root
        self.root.title("CIMPLE DevKit Pro (Modular)")
        self.root.geometry("1100x700")
        self.root.configure(bg=THEME["bg"])

        self.setup_ui()

    def setup_ui(self):
        # 1. Toolbar
        toolbar = tk.Frame(self.root, bg=THEME["sidebar"], height=40)
        toolbar.pack(fill=tk.X, side=tk.TOP)
        
        self.add_btn(toolbar, "📄 New", self.new_file)
        self.add_btn(toolbar, "📁 Open", self.open_folder)
        self.add_btn(toolbar, "💾 Save", self.save_file)
        self.add_btn(toolbar, "▶ Run", self.run_code, bg="#28a745")

        # 2. Main Paned Layout
        self.main_pane = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, bg=THEME["bg"], sashwidth=4)
        self.main_pane.pack(fill=tk.BOTH, expand=True)

        # Sidebar
        self.explorer = FileExplorer(self.main_pane, self.open_file)
        self.main_pane.add(self.explorer, width=250)

        # Editor + Terminal Area
        right_frame = tk.Frame(self.main_pane, bg=THEME["bg"])
        self.main_pane.add(right_frame)

        self.vert_pane = tk.PanedWindow(right_frame, orient=tk.VERTICAL, bg=THEME["bg"], sashwidth=4)
        self.vert_pane.pack(fill=tk.BOTH, expand=True)

        self.editor = CodeEditor(self.vert_pane)
        self.vert_pane.add(self.editor, height=450)

        self.terminal = tk.Text(self.vert_pane, bg="black", fg="#00ff00", font=("Consolas", 10))
        self.vert_pane.add(self.terminal, height=200)

        # 3. Status Bar
        self.status_bar = tk.Label(self.root, text=" Ready", bg=THEME["accent"], fg="white", anchor="w")
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)

    def add_btn(self, parent, text, cmd, bg=THEME["sidebar"]):
        btn = tk.Button(parent, text=text, command=cmd, bg=bg, fg="white", relief="flat", padx=10)
        btn.pack(side=tk.LEFT, padx=2, pady=5)

    # --- Actions ---
    def new_file(self):
        self.editor.add_tab()

    def open_folder(self):
        path = filedialog.askdirectory()
        if path:
            self.explorer.load_directory(path)

    def open_file(self, path):
        with open(path, 'r') as f:
            content = f.read()
            self.editor.add_tab(content, os.path.basename(path), path)

    def save_file(self):
        curr_tab_id = str(self.editor.select())
        if not curr_tab_id: return
        
        data = self.editor.open_tabs_data[curr_tab_id]
        path = data["path"]

        if not path:
            path = filedialog.asksaveasfilename(defaultextension=".cimp")
            if not path: return
            data["path"] = path
            self.editor.tab("current", text=os.path.basename(path))

        content = data["widget"].get("1.0", "end-1c")
        with open(path, 'w') as f:
            f.write(content)
        self.status_bar.config(text=f" Saved: {path}")

    def run_code(self):
        curr_tab_id = str(self.editor.select())
        data = self.editor.open_tabs_data.get(curr_tab_id)
        
        if not data or not data["path"]:
            messagebox.showinfo("CIMPLE", "Please save the file first.")
            return

        self.save_file()
        run_cimple_code(data["path"], self.terminal, self.root)

if __name__ == "__main__":
    root = tk.Tk()
    app = CimpleDevKit(root)
    root.mainloop()