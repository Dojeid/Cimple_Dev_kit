# upgraded_sidebar.py
import os
import tkinter as tk
from tkinter import ttk
from styles import THEME

class ProjectExplorer(tk.Frame):
    def __init__(self, master, on_file_open_callback):
        super().__init__(master, bg=THEME["sidebar"])
        self.on_file_open = on_file_open_callback
        
        # Using Treeview instead of Listbox for a "Pro" look
        self.tree = ttk.Treeview(self, show="tree", selectmode="browse")
        self.tree.pack(fill=tk.BOTH, expand=True)
        
        # Scrollbar for long projects
        self.scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.configure(yscrollcommand=self.scrollbar.set)

        self.tree.bind('<Double-1>', self._handle_double_click)

    def load_directory(self, folder_path):
        # Clear existing items
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        abspath = os.path.abspath(folder_path)
        root_node = self.tree.insert("", "end", text=os.path.basename(abspath), open=True)
        self._process_directory(root_node, abspath)

    def _process_directory(self, parent, path):
        # Logic to scan folders and files recursively
        for entry in os.scandir(path):
            if entry.is_dir():
                # Add folder
                node = self.tree.insert(parent, "end", text=entry.name, open=False)
                self._process_directory(node, entry.path)
            elif entry.name.endswith(".cimp"):
                # Add file with a specific tag (you could add icons here!)
                self.tree.insert(parent, "end", text=entry.name, values=(entry.path,))

    def _handle_double_click(self, event):
        item_id = self.tree.selection()[0]
        item_values = self.tree.item(item_id, "values")
        if item_values: # It's a file, not a folder
            file_path = item_values[0]
            self.on_file_open(file_path)