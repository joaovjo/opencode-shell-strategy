# Shell non-interactive strategy

**Context:** OpenCode's shell environment is non-interactive: it has no TTY/PTY, so commands that wait for input, launch a pager, or open an editor will hang until timeout.

**Scope:** This file is a portable policy for headless agent environments. It is loaded by OpenCode as an instruction file. The rules apply across diverse operating systems (Windows 11 Pro, Ubuntu 26.04+, Arch Linux) and shells (PowerShell 7+, bash, fish).

## 1. Core rules

1. **No editors or pagers.** `vim`, `nano`, `vi`, `emacs`, `less`, `more`, `man`, and similar TTY tools are banned.
2. **No interactive modes.** Avoid flags or tools that open an interactive UI/session, such as `git add -p`, `git rebase -i`, `bash -i`, `pwsh -NoExit`, or raw REPL prompts.
3. **Use command-specific non-interactive flags.** Prefer documented flags (`-y`, `--no-input`, `--no-edit`, `--no-pager`, `--noconfirm`, `--silent`) over generic force.
4. **Fail fast on missing authorization.** When a command cannot run without a password or user choice, use a non-interactive fail-fast form (`sudo -n`, `BatchMode=yes`) or stop and report.
5. **Prefer OpenCode tools.** Use `Read`, `Write`, and `Edit` for file operations instead of shell text manipulation when they are available.

## 2. Modern development stack

### Bun & bunx (JavaScript / TypeScript runtime & package manager)

Always prefer `bun` and `bunx` over legacy package managers (`npm`, `pnpm`, `yarn`, `node`).

- **Project initialization:** Use `bun init -y` to scaffold without interactive questions.
- **Dependency management:** `bun install` is non-interactive by default. In CI or strict headless tasks, prefer `bun install --frozen-lockfile`. Add packages using `bun add <pkg>`.
- **Script execution & testing:** Run scripts via `bun run <script>` or directly execute files via `bun <file.ts>`. Run tests non-interactively with `bun test`.
- **On-the-fly execution:** Use `bunx <pkg>` or `bun x <pkg>` to execute binaries without global installations.
- **REPL / Inline code:** Do not run bare `bun repl` or `bun` without arguments. Use `bun -e "code"` or `bun eval "code"` for inline evaluation.
- **Bun Shell:** In scripts, leverage Bun Shell (`import { $ } from "bun"`) for safe cross-platform command execution and child-process pipelines.

```bash
bun init -y
bun add express
bun test
bun -e "console.log('headless execution')"
```

### Astral uv (Python tooling & environment manager)

Always prefer `uv` over standard python installations, raw `pip`, or manual `venv` activation scripts.

- **Project initialization:** Use `uv init` (or `uv init --no-workspace <name>`) to create projects non-interactively.
- **Dependency management:** Use `uv add <pkg>` and `uv remove <pkg>`.
- **Command & script execution:** Always use `uv run <command>` (e.g., `uv run python script.py` or `uv run pytest`). `uv run` automatically resolves, creates, and locks the virtual environment on the fly without needing manual and error-prone shell activation scripts (`source .venv/bin/activate` or `.\.venv\Scripts\Activate.ps1`).
- **Pip compatibility:** If `pip` interface is needed, use `uv pip install --no-input <pkg>`.
- **Python version management:** Install Python runtimes non-interactively via `uv python install <version>`.
- **Inline code:** Run inline Python code using `uv run python -c "code"`.

```bash
uv init my-project
uv add requests
uv run python -c "import requests; print(requests.__version__)"
```

### fnm (Fast Node Manager)

When Node.js version switching is required for legacy tooling:

- **Switch or install version:** Use `fnm use --install-if-missing <version>` to avoid interactive install confirmations.
- **Execute with specific runtime:** Use `fnm exec --using=<version> <command>` to run non-interactively in isolated contexts.
- **Avoid shell hook prompts:** Do not invoke interactive shell setup wizards in headless environments.

```bash
fnm use --install-if-missing 22
fnm exec --using=22 bun test
```

## 3. Multi-Shell & Multi-OS Matrix

Agents operate across diverse operating systems and shell dialects. Follow the appropriate syntax for each environment.

### Inline environment variables syntax

| Shell | Syntax | Example |
|-------|--------|---------|
| **bash** | `VAR=val command` | `GIT_TERMINAL_PROMPT=0 git clone https://...` |
| **fish** | `env VAR=val command` or `VAR=val command` (fish >= 3.1) | `env UV_NO_PROGRESS=1 uv run script.py` |
| **PowerShell 7+** | `$env:VAR='val'; command` or `pwsh -Command "$env:VAR='val'; command"` | `$env:GIT_TERMINAL_PROMPT='0'; git clone https://...` |

### Non-interactive file operations

| Operation | POSIX (bash / fish) | PowerShell 7+ (Windows 11) | Notes |
|-----------|---------------------|----------------------------|-------|
| Remove file/dir | `rm -f <file>` / `rm -rf <dir>` | `Remove-Item -Force -Recurse <path>` | Avoid `rm -i`. Verify target path carefully before running. |
| Copy | `cp -f <src> <dest>` | `Copy-Item -Force -Recurse <src> <dest>` | Avoid `cp -i`. |
| Move / Rename | `mv -f <src> <dest>` | `Move-Item -Force <src> <dest>` | Avoid `mv -i`. |
| Extract ZIP | `unzip -o archive.zip` | `Expand-Archive -Force archive.zip -DestinationPath .` | Overwrites existing files without prompt. |

### System package managers

| OS | Tool | Interactive (BAD) | Non-interactive (GOOD) |
|----|------|-------------------|------------------------|
| **Arch Linux** | `pacman` | `pacman -S <pkg>` | `sudo -n pacman -S --noconfirm <pkg>` |
| **Ubuntu / Debian** | `apt-get` | `apt-get install <pkg>` | `sudo -n apt-get install -y <pkg>` |
| **Windows 11** | `winget` | `winget install <id>` | `winget install --silent --accept-package-agreements --accept-source-agreements <id>` |
| **Windows 11** | `scoop` | `scoop install <pkg>` | `scoop install <pkg>` (non-interactive by default) |

## 4. Git, SSH and Privileges

### Git operations

| Action | Interactive (BAD) | Non-interactive (GOOD) |
|--------|-------------------|------------------------|
| commit | `git commit` | `git commit -m "msg"` |
| merge | `git merge branch` | `git merge --no-edit branch` |
| pull | `git pull` | `git pull --no-edit` |
| rebase | `git rebase -i` | `git rebase` |
| add | `git add -p` | `git add <file>` |
| log | `git log` (triggers pager) | `git --no-pager log` |
| diff | `git diff` (triggers pager) | `git --no-pager diff` |

### SSH and host verification

For an explicitly trusted first contact with a new host, use `StrictHostKeyChecking=accept-new` and `BatchMode=yes` with a timeout:

```bash
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 user@host
```

`StrictHostKeyChecking=no` is strictly prohibited because it silently accepts changed host keys and ignores security warnings.

### Privileged commands

Use `sudo -n` to run a command only when passwordless execution is configured. If a password is required, `sudo -n` fails immediately instead of hanging on password prompt.

```bash
sudo -n systemctl status nginx
```

Never pipe passwords into `sudo -S` or any other prompt (`echo password | sudo ...` is banned).

## 5. Quick command reference

| Category | Tool / Action | Interactive (BAD) | Non-interactive (GOOD) |
|----------|---------------|-------------------|------------------------|
| **JS / TS** | bun init | `bun init` | `bun init -y` |
| **JS / TS** | bun run/test | `bun repl` | `bun test` / `bun -e "code"` |
| **Python** | uv init | `uv init` (with prompt) | `uv init --no-workspace` |
| **Python** | uv run | manual `.venv` activate | `uv run <command>` / `uv run python -c "code"` |
| **Python** | uv pip | `uv pip install` | `uv pip install --no-input <pkg>` |
| **Node Mgr** | fnm | `fnm use` (prompting) | `fnm use --install-if-missing <ver>` |
| **Linux PKG** | pacman | `pacman -S pkg` | `sudo -n pacman -S --noconfirm pkg` |
| **Linux PKG** | apt | `apt-get install pkg` | `sudo -n apt-get install -y pkg` |
| **Windows PKG**| winget | `winget install id` | `winget install --silent --accept-package-agreements --accept-source-agreements id` |
| **Git** | git commit | `git commit` | `git commit -m "msg"` |
| **Git** | git pager | `git log` / `git diff` | `git --no-pager log` / `git --no-pager diff` |

## 6. Optional per-command environment variables

Set these variables per command when needed. Do not export them globally in profile files (`.bashrc`, `.profile`, `.zshrc`, `$PROFILE`).

| Variable | Value | Effect |
|----------|-------|--------|
| `UV_NO_PROGRESS` | `1` | Disables animated progress spinners in uv |
| `UV_NON_INTERACTIVE` | `1` | Forces uv to fail fast if any input is needed |
| `GIT_TERMINAL_PROMPT` | `0` | Disables git HTTP terminal password prompts |
| `DEBIAN_FRONTEND` | `noninteractive` | Suppresses interactive dialogs in apt/dpkg |
| `PIP_NO_INPUT` | `1` | Disables pip interactive confirmation prompts |
| `HOMEBREW_NO_AUTO_UPDATE` | `1` | Disables brew update checks before install |

Example (bash / fish):
```bash
GIT_TERMINAL_PROMPT=0 git clone https://github.com/example/repo.git
```

Example (PowerShell 7+):
```powershell
$env:GIT_TERMINAL_PROMPT='0'; git clone https://github.com/example/repo.git
```

## 7. Source references

- Bun: [Bun Documentation](https://bun.com/docs), [Bun Blog](https://bun.com/blog), [Bun Shell](https://bun.com/docs/runtime/shell), [Bun Child Process](https://bun.com/docs/runtime/child-process).
- Astral uv: [uv Documentation](https://docs.astral.sh/uv/) — `uv init`, `uv run`, `uv add`, `uv pip`, `uv python`.
- fnm: [Fast Node Manager](https://github.com/schniz/fnm) — `--install-if-missing`, `exec`.
- Git: [git-commit](https://git-scm.com/docs/git-commit), [git-merge](https://git-scm.com/docs/git-merge), [git-pull](https://git-scm.com/docs/git-pull), [git-rebase](https://git-scm.com/docs/git-rebase); `--no-edit`, `--no-pager`, `-m`.
- OpenSSH: [ssh_config(5)](https://man.openbsd.org/ssh_config) — `BatchMode`, `StrictHostKeyChecking`, `ConnectTimeout`.
- sudo: [sudo(8)](https://www.sudo.ws/docs/man/sudo.man/) — `-n` non-interactive mode.
- OpenCode: instructions are loaded from the `instructions[]` array in [opencode.json/opencode.jsonc](https://opencode.ai/docs/config/); see also [Rules](https://opencode.ai/docs/rules/).
