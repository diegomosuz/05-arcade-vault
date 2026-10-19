// PostToolUse hook (Write): pasa Prettier y ESLint --fix por los archivos
// React (.tsx/.jsx) y Markdown (.md) recién creados dentro del proyecto.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw || "{}");
const file = input.tool_response?.filePath ?? input.tool_input?.file_path;
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

if (!file || !existsSync(file)) process.exit(0);

// Solo archivos dentro del proyecto, excluyendo dependencias y salidas de build.
const rel = path.relative(projectDir, file).replaceAll("\\", "/");
if (rel.startsWith("..") || /^(node_modules|\.next|references)\//.test(rel)) {
  process.exit(0);
}

const ext = path.extname(file).toLowerCase();
const isReact = ext === ".tsx" || ext === ".jsx";
const isMarkdown = ext === ".md";
if (!isReact && !isMarkdown) process.exit(0);

const run = (args) =>
  spawnSync(`npx --no-install ${args.join(" ")}`, {
    cwd: projectDir,
    encoding: "utf8",
    shell: true,
  });

const messages = [];

const prettier = run(["prettier", "--write", `"${file}"`]);
if (prettier.status !== 0) {
  messages.push(`Prettier falló en ${rel}:\n${prettier.stderr || prettier.stdout}`);
}

// ESLint solo aplica a código React; el Markdown no está en su configuración.
if (isReact) {
  const eslint = run(["eslint", "--fix", `"${file}"`]);
  // Código 1 = quedan errores de lint sin autofix; se los reportamos a Claude.
  if (eslint.status !== 0) {
    messages.push(`ESLint reporta problemas en ${rel}:\n${eslint.stdout || eslint.stderr}`);
  }
}

if (messages.length > 0) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: messages.join("\n\n"),
      },
    }),
  );
}
