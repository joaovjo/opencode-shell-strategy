import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DOCS_DIR = process.env.DOCS_DIR || ".";
const README_PATH = join(DOCS_DIR, "README.md");
const STRATEGY_PATH = join(DOCS_DIR, "shell_strategy.md");

describe("opencode-shell-strategy v2.0.0 verification", () => {
  test("required documentation files exist", () => {
    expect(existsSync(README_PATH)).toBe(true);
    expect(existsSync(STRATEGY_PATH)).toBe(true);
  });

  const readmeContent = existsSync(README_PATH) ? readFileSync(README_PATH, "utf-8") : "";
  const strategyContent = existsSync(STRATEGY_PATH) ? readFileSync(STRATEGY_PATH, "utf-8") : "";

  function extractCodeBlocks(content: string): Array<{ lang: string; code: string; line: number }> {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const blocks: Array<{ lang: string; code: string; line: number }> = [];
    let inBlock = false;
    let currentLang = "";
    let currentCode: string[] = [];
    let startLine = 0;

    const shellLangs = new Set(["sh", "bash", "zsh", "powershell", "pwsh"]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^```(\w+)?$/);
      if (match && !inBlock) {
        inBlock = true;
        currentLang = (match[1] || "").toLowerCase();
        currentCode = [];
        startLine = i + 1;
      } else if (line.trim() === "```" && inBlock) {
        inBlock = false;
        if (shellLangs.has(currentLang)) {
          blocks.push({
            lang: currentLang,
            code: currentCode.join("\n"),
            line: startLine,
          });
        }
      } else if (inBlock) {
        currentCode.push(line);
      }
    }
    return blocks;
  }

  const allBlocks = [
    ...extractCodeBlocks(readmeContent),
    ...extractCodeBlocks(strategyContent),
  ];

  const prohibitedPatterns = [
    "yes |",
    "StrictHostKeyChecking=no",
    "sudo -S",
    'echo "password" | sudo',
    "export ",
    ">> ~/.bashrc",
    ">> ~/.profile",
    ">> ~/.zshrc",
  ];

  test("no prohibited patterns in fenced shell blocks", () => {
    for (const block of allBlocks) {
      if (block.code.startsWith("# fixture-exempt: negative-example")) {
        continue;
      }
      for (const pattern of prohibitedPatterns) {
        expect(block.code.includes(pattern)).toBe(
          false,
          `Found prohibited pattern "${pattern}" around line ${block.line}: \n${block.code}`
        );
      }
    }
  });

  const requiredForms = [
    "BatchMode=yes",
    "StrictHostKeyChecking=accept-new",
    "sudo -n",
    "bun init -y",
    "bun test",
    "uv run",
    "fnm use",
  ];

  test("all required safe forms are documented in shell blocks", () => {
    const combinedBlocks = allBlocks.map((b) => b.code).join("\n\n");
    for (const form of requiredForms) {
      expect(combinedBlocks.includes(form)).toBe(
        true,
        `Required safe form "${form}" was not found in any fenced shell block.`
      );
    }
  });

  test("README installation section uses remote trunk instructions[] format", () => {
    expect(readmeContent).toMatch(/"instructions":\s*\[\s*"https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/trunk\/shell_strategy\.md"\s*\]/);
    expect(readmeContent.includes("~/.config/opencode/plugin/shell-strategy")).toBe(false);
  });

  test("package.json has correct v2.0.0 metadata and scripts", () => {
    const pkg = JSON.parse(readFileSync(join(DOCS_DIR, "package.json"), "utf-8"));
    expect(pkg.version).toBe("2.0.0");
    expect(pkg.scripts?.test).toBe("bun test");
  });
});
