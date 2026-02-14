# sidebar.py
import tkinter as tk
import tkinter.simpledialog
from tkinter import ttk, filedialog, messagebox
import os

class FileExplorer(ttk.Frame):
    def __init__(self, master, open_callback):
        super().__init__(master)
        self.open_callback = open_callback
        self.current_dir = None

        # Treeview
        self.tree = ttk.Treeview(self, show="tree", selectmode="browse")
        self.tree.pack(fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(self, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bindings
        self.tree.bind("<Double-1>", self.on_double_click)
        self.tree.bind("<Button-3>", self.show_context_menu)

        # Context menu
        self.menu = tk.Menu(self, tearoff=0)
        self.menu.add_command(label="New File (.cimp)", command=self.new_file)
        self.menu.add_command(label="New Folder", command=self.new_folder)
        self.menu.add_separator()
        self.menu.add_command(label="Delete", command=self.delete_item)
        self.menu.add_command(label="Refresh", command=self.refresh)

    def load_directory(self, path):
        self.current_dir = path
        self.tree.delete(*self.tree.get_children())
        self._insert_node("", path)

    def _insert_node(self, parent, path):
        try:
            for name in sorted(os.listdir(path)):
                full = os.path.join(path, name)
                if os.path.isdir(full):
                    node = self.tree.insert(parent, "end", text="📁 " + name, values=(full, "dir"))
                    self._insert_node(node, full)  # recursive for small projects
                else:
                    icon = "📄 " if name.endswith(".cimp") else "📝 "
                    self.tree.insert(parent, "end", text=icon + name, values=(full, "file"))
        except PermissionError:
            pass  # skip directories we can't read

    def on_double_click(self, event):
        sel = self.tree.selection()
        if not sel: return
        item = sel[0]
        path, typ = self.tree.item(item, "values")
        if typ == "file":
            self.open_callback(path)

    def show_context_menu(self, event):
        self.tree.selection_set(self.tree.identify_row(event.y))
        self.menu.post(event.x_root, event.y_root)

    def new_file(self):
        if not self.current_dir: return
        name = tk.simpledialog.askstring("New CIMPLE File", "Filename (with .cimp):", initialvalue="new.cimp")
        if name:
            path = os.path.join(self.current_dir, name)
            open(path, "w").close()
            self.refresh()
            self.open_callback(path)

    def new_folder(self):
        if not self.current_dir: return
        name = tk.simpledialog.askstring("New Folder", "Folder name:")
        if name:
            os.makedirs(os.path.join(self.current_dir, name), exist_ok=True)
            self.refresh()

    def delete_item(self):
        sel = self.tree.selection()
        if not sel: return
        path, _ = self.tree.item(sel[0], "values")
        if messagebox.askyesno("Delete", f"Delete {os.path.basename(path)}?"):
            try:
                if os.path.isdir(path):
                    os.rmdir(path)
                else:
                    os.remove(path)
                self.refresh()
            except Exception as e:
                messagebox.showerror("Error", str(e))

    def refresh(self):
        if self.current_dir:
            self.load_directory(self.current_dir)