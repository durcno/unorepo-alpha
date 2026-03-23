import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import open from "open";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {
	type Changenote,
	type ChangenoteCommit,
	type CommitAuthor,
	createGitOps,
	loadConfig,
	type PkgFileAbsPath,
	readChangenotes,
	readPkg,
	type VersionBump,
} from "unorepo-alpha";
import { CONFIG_FILE_NAME } from "../../const";

export async function previewCommand(): Promise<void> {
	const rootDir = process.cwd();
	const config = await loadConfig(join(rootDir, CONFIG_FILE_NAME));

	p.intro("Generating changelog preview...");

	const changenotesDir = join(rootDir, ".changenotes");
	const allChangenotes = await readChangenotes(changenotesDir);

	if (allChangenotes.length === 0) {
		p.log.warning("No changenotes found.");
		p.log.info("Run `unorepo-alpha change` to add a changenote first.");
		p.outro("Nothing to preview.");
		return;
	}

	p.log.info(`Found ${allChangenotes.length} changenote(s)`);

	// Enrich changenotes with git metadata
	const gitOps = createGitOps(rootDir);
	const changenotes: (Changenote & {
		commit: ChangenoteCommit;
		authors: CommitAuthor[];
	})[] = [];

	for (const cn of allChangenotes) {
		const meta = await gitOps.getFileAddCommit(cn.filePath);
		const authors = await gitOps.getFileAuthors(cn.filePath);
		changenotes.push({ ...cn, commit: meta, authors });
	}

	// Read package.json for the package name
	const pkgJsonPath = join(rootDir, "package.json");
	const pkgJson = readPkg(pkgJsonPath as PkgFileAbsPath, rootDir);

	// Build a fake VersionBump — no prepare.json needed
	const versionBump: VersionBump = {
		packageName: pkgJson.name,
		currentVersion: pkgJson.version,
		newVersion: "x.x.x",
		bump: "patch",
	};

	// Generate changelog markdown
	const changelog = await config.changelog.generator(
		versionBump,
		changenotes,
		config,
	);

	p.log.success("Changelog markdown generated");

	// Convert markdown to HTML
	const result = await unified()
		.use(remarkParse)
		.use(remarkRehype)
		.use(rehypeStringify)
		.process(changelog);

	const htmlBody = String(result);

	// Wrap in a styled HTML template
	const html = buildHtmlPage(pkgJson.name, htmlBody);

	// Write to temp file and open in browser
	const tmpPath = join(tmpdir(), "unorepo-changelog-preview.html");
	writeFileSync(tmpPath, html, "utf-8");

	p.log.info(`Saved preview to ${tmpPath}`);

	await open(tmpPath);

	p.outro("Opened changelog preview in browser!");
}

function buildHtmlPage(packageName: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changelog Preview — ${packageName}</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-subtle: #1f6feb33;
      --green: #3fb950;
      --orange: #d29922;
      --red: #f85149;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .badge {
      display: inline-block;
      background: var(--accent-subtle);
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid var(--accent);
      margin-bottom: 16px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .content {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px 40px;
      margin-top: 8px;
    }

    .content h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }

    .content h2 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 32px;
      margin-bottom: 12px;
      color: var(--text);
    }

    .content h3 {
      font-size: 16px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 8px;
      color: var(--text-muted);
    }

    .content p {
      margin-bottom: 12px;
      color: var(--text);
    }

    .content ul, .content ol {
      padding-left: 24px;
      margin-bottom: 12px;
    }

    .content li {
      margin-bottom: 8px;
    }

    .content a {
      color: var(--accent);
      text-decoration: none;
    }

    .content a:hover {
      text-decoration: underline;
    }

    .content blockquote {
      border-left: 4px solid var(--accent);
      padding: 8px 16px;
      margin: 12px 0;
      background: var(--accent-subtle);
      border-radius: 0 8px 8px 0;
      color: var(--text-muted);
    }

    .content blockquote p {
      margin: none;
    }

    .content code {
      background: rgba(110,118,129,0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }

    .content pre {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 12px 0;
    }

    .content pre code {
      background: transparent;
      padding: 0;
    }

    .footer {
      text-align: center;
      margin-top: 32px;
      color: var(--text-muted);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">preview</span>
    <div class="content">
      ${body}
    </div>
    <p class="footer">Generated by unorepo-alpha</p>
  </div>
</body>
</html>`;
}
