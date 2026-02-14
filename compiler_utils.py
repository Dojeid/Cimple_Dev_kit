# compiler_utils.py
import subprocess
import threading
import os
import re

def run_cimple_code(file_path, output_widget, root, editor_widget=None):
    def execute():
        root.after(0, lambda: output_widget.clear())
        root.after(0, lambda: output_widget.write_output(f"▶ Running {os.path.basename(file_path)}...\n{'─' * 50}\n\n", "info"))

        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            compiler_path = os.path.join(script_dir, ".compiler", "cimple.exe")
            process = subprocess.Popen(
                [compiler_path, file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate()

            output = stdout + stderr
            root.after(0, lambda: _process_output(output, output_widget, editor_widget))

        except Exception as e:
            root.after(0, lambda: output_widget.write_output(f"❌ System Error: {str(e)}\n", "error"))

    threading.Thread(target=execute, daemon=True).start()


def _process_output(output, widget, editor_widget):
    widget.write_output(output, "stdout")

    # Make errors clickable in the terminal's output text widget
    if editor_widget and ("error" in output.lower() or ":" in output):
        out = widget.output  # the underlying Text widget
        out.config(state="normal")
        for match in re.finditer(r'(\w+\.cimp):(\d+):', output):
            filename, line = match.group(1), int(match.group(2))
            start = out.search(f"{filename}:{line}:", "1.0", "end")
            if start:
                tag_name = f"err_{line}"
                end = f"{start}+{len(match.group(0))}c"
                out.tag_add(tag_name, start, end)
                out.tag_config(tag_name, foreground="#ff5555", underline=True)
                out.tag_bind(tag_name, "<Button-1>", lambda e, ln=line: _jump_to_line(editor_widget, ln))
        out.config(state="disabled")


def _jump_to_line(editor_widget, line):
    """Jump the editor cursor to the specified line number."""
    if editor_widget:
        editor_widget.mark_set("insert", f"{line}.0")
        editor_widget.see(f"{line}.0")
        editor_widget.focus_set()