# terminal.py
import tkinter as tk
import subprocess
import threading
import os
import sys
from styles import THEME


class InteractiveTerminal(tk.Frame):
    """A VS Code-style integrated terminal with a persistent shell session."""

    def __init__(self, master, **kwargs):
        super().__init__(master, bg=THEME["terminal_bg"])
        self.shell_process = None
        self._reading = False

        # Terminal text widget — single widget for both output and input (like a real terminal)
        self.output = tk.Text(
            self,
            bg=THEME["terminal_bg"],
            fg="#cccccc",
            font=("Consolas", 11),
            insertbackground="#cccccc",
            selectbackground="#264f78",
            selectforeground="#ffffff",
            borderwidth=0,
            padx=8,
            pady=6,
            wrap="word",
            undo=False,
        )
        self.output.pack(fill=tk.BOTH, expand=True)

        # Scrollbar
        scrollbar = tk.Scrollbar(self.output, command=self.output.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.output.config(yscrollcommand=scrollbar.set)

        # Tag styles
        self.output.tag_config("stdout", foreground="#cccccc")
        self.output.tag_config("stderr", foreground="#f44747")
        self.output.tag_config("info", foreground="#3dc9b0")
        self.output.tag_config("prompt", foreground="#6a9955")
        self.output.tag_config("error", foreground="#f44747")
        self.output.tag_config("success", foreground="#4ec9b0")

        # Key bindings
        self.output.bind("<Return>", self._on_enter)
        self.output.bind("<Key>", self._on_key)
        self.output.bind("<BackSpace>", self._on_backspace)
        # Prevent mouse from moving cursor before the input area
        self.output.bind("<Button-1>", self._on_click)

        # Track where user input begins (everything after this mark is user's typed input)
        self.output.mark_set("input_start", "end-1c")
        self.output.mark_gravity("input_start", "left")

        # Start the shell
        self._start_shell()

    def _start_shell(self):
        """Start a persistent shell process."""
        try:
            # Use cmd.exe for a Windows shell experience
            self.shell_process = subprocess.Popen(
                ["cmd.exe"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=0,
                creationflags=subprocess.CREATE_NO_WINDOW,
                env=os.environ.copy(),
            )
            self._reading = True

            # Start reader threads for stdout and stderr
            threading.Thread(target=self._read_stream, args=(self.shell_process.stdout, "stdout"), daemon=True).start()
            threading.Thread(target=self._read_stream, args=(self.shell_process.stderr, "stderr"), daemon=True).start()

        except Exception as e:
            self._append_text(f"Failed to start shell: {e}\n", "error")

    def _read_stream(self, stream, tag):
        """Continuously read from a shell output stream and display it."""
        try:
            while self._reading and self.shell_process and self.shell_process.poll() is None:
                char = stream.read(1)
                if char:
                    self.after(0, lambda c=char, t=tag: self._append_text(c, t))
                else:
                    break
        except (OSError, ValueError):
            pass  # Stream closed

        # If shell died, show message
        if self._reading:
            self.after(0, lambda: self._append_text("\n[Shell session ended]\n", "info"))

    def _append_text(self, text, tag=None):
        """Append text to the terminal at the input_start mark position (before user input)."""
        # Save any user input currently being typed
        try:
            user_input = self.output.get("input_start", "end-1c")
        except tk.TclError:
            user_input = ""

        # Delete user input temporarily
        if user_input:
            self.output.delete("input_start", "end-1c")

        # Insert the shell output
        if tag:
            self.output.insert("input_start", text, tag)
        else:
            self.output.insert("input_start", text)

        # Re-insert user input after the new output
        if user_input:
            self.output.insert("end-1c", user_input)

        # Move input_start to after the inserted text (but before user input)
        # We need to recalculate where input starts
        if user_input:
            # input_start should be at end minus the user input length
            pos = f"end-1c-{len(user_input)}c"
            self.output.mark_set("input_start", pos)
        else:
            self.output.mark_set("input_start", "end-1c")

        self.output.see("end")

    def _on_enter(self, event=None):
        """Send the typed input line to the shell."""
        # Get text from input_start to end
        try:
            user_input = self.output.get("input_start", "end-1c")
        except tk.TclError:
            user_input = ""

        # Add newline to display
        self.output.insert("end-1c", "\n")
        self.output.mark_set("input_start", "end-1c")

        # Send to shell
        if self.shell_process and self.shell_process.poll() is None:
            try:
                self.shell_process.stdin.write(user_input + "\n")
                self.shell_process.stdin.flush()
            except (OSError, BrokenPipeError):
                self._append_text("[Shell session ended]\n", "info")
                self._start_shell()
        else:
            self._append_text("[No active shell — restarting...]\n", "info")
            self._start_shell()

        return "break"

    def _on_key(self, event=None):
        """Prevent editing output area — only allow typing after input_start."""
        if event.keysym in ("Return", "BackSpace", "Left", "Right", "Up", "Down",
                            "Home", "End", "Shift_L", "Shift_R", "Control_L",
                            "Control_R", "Alt_L", "Alt_R", "Caps_Lock", "Tab"):
            return  # Let other handlers deal with these

        # Handle Ctrl+C to send interrupt
        if event.state & 0x4 and event.keysym.lower() == 'c':
            self._send_interrupt()
            return "break"

        # Handle Ctrl+V for paste
        if event.state & 0x4 and event.keysym.lower() == 'v':
            try:
                text = self.output.clipboard_get()
                self.output.insert("end-1c", text)
                self.output.see("end")
            except tk.TclError:
                pass
            return "break"

        # Ensure cursor is in the editable area
        cursor_pos = self.output.index("insert")
        input_start = self.output.index("input_start")

        if self.output.compare(cursor_pos, "<", input_start):
            # Move cursor to end before inserting
            self.output.mark_set("insert", "end-1c")

        return None

    def _on_backspace(self, event=None):
        """Prevent backspacing into the output area."""
        cursor_pos = self.output.index("insert")
        input_start = self.output.index("input_start")

        if self.output.compare(cursor_pos, "<=", input_start):
            return "break"  # Don't allow deleting output
        return None

    def _on_click(self, event=None):
        """Allow clicking, but if user types after clicking in output area, redirect to end."""
        # Let the click happen naturally for text selection
        return None

    def _send_interrupt(self):
        """Send Ctrl+C (interrupt) to the shell process."""
        if self.shell_process and self.shell_process.poll() is None:
            try:
                import signal
                self.shell_process.send_signal(signal.CTRL_C_EVENT)
            except (OSError, AttributeError):
                pass
            self._append_text("^C\n", "error")
            self.output.mark_set("input_start", "end-1c")

    def set_cwd(self, path):
        """Change the shell's current directory."""
        if self.shell_process and self.shell_process.poll() is None and os.path.isdir(path):
            try:
                self.shell_process.stdin.write(f'cd /d "{path}"\n')
                self.shell_process.stdin.flush()
            except (OSError, BrokenPipeError):
                pass

    def write_output(self, text, tag=None):
        """Public method for compiler output to write to the terminal."""
        self._append_text(text, tag)

    def clear(self):
        """Clear the terminal display."""
        self.output.delete("1.0", "end")
        self.output.mark_set("input_start", "end-1c")

    def destroy(self):
        """Clean up the shell process on widget destruction."""
        self._reading = False
        if self.shell_process and self.shell_process.poll() is None:
            try:
                self.shell_process.terminate()
                self.shell_process.wait(timeout=2)
            except Exception:
                try:
                    self.shell_process.kill()
                except Exception:
                    pass
        super().destroy()
