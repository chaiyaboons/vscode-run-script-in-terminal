# Run Script in Terminal

Right-click a **`.sh`**, **`.bat`**, **`.cmd`** or **`.ps1`** file and choose **Run in New Terminal** — a fresh integrated terminal opens with the right shell and runs the script immediately.

## Features

- **Explorer context menu** – right-click one or more script files → *Run in New Terminal*. Each selected file gets its own terminal.
- **Editor context menu & tab menu** – right-click inside an open script or on its tab.
- **▶ Run button** in the editor title bar (can be turned off).
- **Run with Arguments…** – prompts for arguments before running.
- The right shell for every file type:

| File | Shell | Command typed |
|---|---|---|
| `.ps1` | PowerShell (`powershell.exe` on Windows, `pwsh` elsewhere) | `& 'C:\path\script.ps1'` |
| `.bat` / `.cmd` | `cmd.exe` (Windows only) | `call "C:\path\script.bat"` |
| `.sh` | bash (Git Bash or WSL on Windows, `/bin/bash` on macOS/Linux) | `bash '/path/script.sh'` |

- `.sh` files are run with `bash file`, so they **don't need the executable bit**.
- On Windows, paths are converted automatically for Git Bash (`C:/…`) and WSL (`/mnt/c/…`).
- PowerShell starts with `-ExecutionPolicy Bypass` (current process only) so scripts aren't blocked.
- Unsaved changes are saved before running.

## Settings

| Setting | Default | Description |
|---|---|---|
| `scriptRunner.cwd` | `scriptDirectory` | Start the terminal in the script's folder or the workspace root. |
| `scriptRunner.bashPath` | *(auto)* | Custom bash for `.sh` files, e.g. `C:\msys64\usr\bin\bash.exe`. |
| `scriptRunner.powershellPath` | *(auto)* | Custom PowerShell, e.g. `pwsh.exe` to use PowerShell 7 on Windows. |
| `scriptRunner.bypassExecutionPolicy` | `true` | Start PowerShell with `-ExecutionPolicy Bypass`. |
| `scriptRunner.saveBeforeRun` | `true` | Save dirty scripts before running. |
| `scriptRunner.reuseTerminal` | `false` | Reuse the previous terminal of the same script. |
| `scriptRunner.preserveFocus` | `false` | Keep focus in the editor. |
| `scriptRunner.showRunButtonInEditorTitle` | `true` | Show the ▶ button in the editor title bar. |

## Requirements

- Windows: Git for Windows or WSL is needed for `.sh` files.
- macOS / Linux: PowerShell 7 (`pwsh`) is needed for `.ps1` files. `.bat`/`.cmd` are Windows-only.

## License

MIT
