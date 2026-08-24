# opencode-shell-strategy

OpenCode instructions for running shell commands safely in a non-interactive environment across diverse operating systems and shells.

OpenCode's shell is non-interactive: it has no TTY/PTY, so commands that wait for input, launch a pager, or open an editor will hang until timeout. These instructions teach an agent to use command-specific non-interactive forms, fail fast when authorization is missing, and avoid unsafe patterns that bypass security controls.

The rules are written for OpenCode and apply to any comparable headless agent host.

## Installation

Add the remote instruction file to your OpenCode configuration:

```json
{
  "instructions": [
    "https://raw.githubusercontent.com/joaovjo/opencode-shell-strategy/trunk/shell_strategy.md"
  ]
}
```

Restart OpenCode. The rules load automatically at the start of each session.

A local clone is optional. If you want to edit or contribute, clone the repository and point your config at the local `shell_strategy.md` path instead.

## What it covers

### Modern dev stack & safe non-interactive forms

| Tool / Ecosystem | Avoid (Interactive / Hangs) | Use (Headless & Safe) |
|------------------|-----------------------------|-----------------------|
| **Bun** (JS/TS) | `bun init` / `bun repl` | `bun init -y`, `bun test`, `bun -e "code"` |
| **Astral uv** (Python) | Manual `.venv` activate / raw pip prompts | `uv init`, `uv run <command>`, `uv pip install --no-input` |
| **fnm** (Node manager) | Interactive version prompts | `fnm use --install-if-missing <ver>`, `fnm exec --using=<ver> <cmd>` |
| **Arch Linux** | `pacman -S pkg` | `sudo -n pacman -S --noconfirm pkg` |
| **Ubuntu / Debian** | `apt-get install pkg` | `sudo -n apt-get install -y pkg` |
| **Windows 11** | `winget install id` | `winget install --silent --accept-package-agreements --accept-source-agreements id` |
| **Git** | `git commit` / `git log` | `git commit -m "msg"`, `git --no-pager log`, `git pull --no-edit` |
| **Files (POSIX)** | `rm -i file` | `rm -f file` (or `cp -f`, `mv -f`) |
| **Files (PowerShell 7+)** | `rm -i` | `Remove-Item -Force -Recurse path` (or `Copy-Item -Force`, `Move-Item -Force`) |
| **SSH first contact** | `ssh host` | `ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 user@host` |

### Always-banned commands

These hang or break autonomy in a non-interactive shell:

- `vim`, `nano`, `vi`, `emacs` (editors)
- `less`, `more`, `man` (pagers)
- `git add -p`, `git rebase -i` (interactive git modes)
- `bun repl`, `python`, `node`, `ipython`, `irb` without a script or `-c`/`-e` argument (REPLs)
- `bash -i`, `zsh -i`, `pwsh -NoExit` (interactive shells)

### Multi-Shell & Multi-OS Support

Supports syntax and tooling conventions across:
- **Windows 11 Pro** (PowerShell 7+): Inline environment setting via `$env:VAR='val'; command`, `Remove-Item -Force`, `winget`.
- **Ubuntu 26.04+ & Arch Linux** (bash & fish): Inline environment setting via `VAR=val command` or `env VAR=val command`, `pacman --noconfirm`, `apt-get -y`.

### Handling commands that must prompt

Do not use `yes | …` or heredocs to blanket-approve unknown prompts. If a command has no non-interactive flag, choose one of:

1. **Use a documented non-interactive flag.** Example: `sudo -n pacman -S --noconfirm pkg` or `bun init -y`.
2. **Fail fast with a non-interactive mode.** Example: `sudo -n command` exits immediately if a password is required.
3. **Stop visibly.** Report that the operation needs credentials, user approval, or a trusted host, and do not proceed.

### SSH and new hosts

For an explicitly trusted first contact, use `StrictHostKeyChecking=accept-new` with a short timeout:

```bash
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 user@host
```

If a host key changes, the command fails. Do not use `StrictHostKeyChecking=no`.

### Privileged commands

Use `sudo -n` to run a command only when it needs no password:

```bash
sudo -n systemctl status nginx
```

If the command requires a password, `sudo -n` fails immediately. Do not pipe passwords into `sudo -S`.

## Testing & Verification

Run automated test validation with **Bun**:

```bash
bun test
```

Or run the POSIX verification script:

```bash
./test.sh verify
```

## License

MIT

## Release notes

### v2.0.0

- **Bun & bunx primary standard:** Added comprehensive headless rules for Bun (`bun init -y`, `bun install`, `bun run`, `bun test`, `bunx`, `bun -e`), replacing node/npm/yarn/pnpm defaults.
- **Astral uv integration:** Full support for `uv` (`uv init`, `uv run`, `uv add`, `uv pip`, `uv python`) eliminating manual venv activation prompts and spinners (`UV_NO_PROGRESS=1`).
- **fnm (Fast Node Manager):** Non-interactive version switching (`fnm use --install-if-missing`) and headless execution (`fnm exec`).
- **Multi-Shell & Multi-OS Matrix:** Complete matrix for PowerShell 7+ (Windows 11 Pro), bash, and fish (Ubuntu 26.04+, Arch Linux), including `pacman`, `apt`, `winget`, `scoop`, and cross-shell inline environment syntax.
- **Bun Test Suite:** Native test harness (`shell_strategy.test.ts`) using `bun:test` and Bun runtime tools.

### v1.1.0

- Safer guidance for commands that need authorization: prefer `sudo -n` so failures are visible instead of hanging, and do not pipe passwords into `sudo -S`.
- Safer SSH first-contact guidance: use `StrictHostKeyChecking=accept-new` with a short timeout and `BatchMode=yes` instead of disabling host-key checks.
- Added a dependency-free verification script (`test.sh verify`) so the rule set can be checked without installing extra tools.
- No new runtime dependencies were introduced.
