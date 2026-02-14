# compiler_utils.py
import subprocess
import threading
import os

def run_cimple_code(file_path, output_widget, root):
    def execute():
        root.after(0, lambda: output_widget.delete("1.0", "end"))
        root.after(0, lambda: output_widget.insert("end", f"--- Running: {os.path.basename(file_path)} ---\n\n"))
        
        try:
            # Note: Ensure the 'compiler' folder exists relative to main.py
            process = subprocess.Popen(
                ["./compiler/cimplec", file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate()
            
            output = stdout + stderr
            root.after(0, lambda: output_widget.insert("end", output + "\n\n[Process Finished]"))
        except Exception as e:
            root.after(0, lambda: output_widget.insert("end", f"System Error: {str(e)}"))

    threading.Thread(target=execute, daemon=True).start()