import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { CONFIG_FILE_NAME } from "../../const";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
const pm: PackageManager = (() => {
	const userAgent = process.env.npm_config_user_agent ?? "";
	if (userAgent.startsWith("pnpm")) return "pnpm";
	if (userAgent.startsWith("yarn")) return "yarn";
	if (userAgent.startsWith("bun")) return "bun";
	return "npm";
})();

export async function initCommand(): Promise<void> {
	const rootDir = process.cwd();
	const tmplDir = resolve(__dirname, "..", "templates");

	p.intro("Initializing Unorepo");

	// Resolve repository owner/name
	let repo = getRepoFromPackageJson(join(rootDir, "package.json"));
	if (!repo) {
		const owner = await p.text({
			message: "GitHub repository owner?",
			validate: (v) => (v?.trim() ? undefined : "Owner is required"),
		});
		if (p.isCancel(owner)) {
			p.cancel("Initialization cancelled");
			process.exit(0);
		}
		const name = await p.text({
			message: "GitHub repository name?",
			validate: (v) => (v?.trim() ? undefined : "Name is required"),
		});
		if (p.isCancel(name)) {
			p.cancel("Initialization cancelled");
			process.exit(0);
		}
		repo = { owner: String(owner).trim(), name: String(name).trim() };
	} else {
		p.log.info(`Detected repository: ${repo.owner}/${repo.name}`);
	}

	// Config file
	const configContent = readFileSync(join(tmplDir, CONFIG_FILE_NAME), "utf-8")
		.replace("__OWNER__", repo.owner)
		.replace("__REPO__", repo.name);
	await fs.writeFile(join(rootDir, CONFIG_FILE_NAME), configContent, "utf-8");
	p.log.success(`Created ${CONFIG_FILE_NAME}`);

	// GitHub Actions workflows
	const workflowsDir = join(rootDir, ".github", "workflows");
	await fs.mkdir(workflowsDir, { recursive: true });

	const installCommands: Record<PackageManager, string> = {
		npm: "npm ci",
		yarn: "yarn install --frozen-lockfile",
		pnpm: "pnpm install --frozen-lockfile",
		bun: "bun install --frozen-lockfile",
	};
	const runtimeActions: Record<PackageManager, string> = {
		npm: "actions/setup-node@v6",
		yarn: "actions/setup-node@v6",
		pnpm: "actions/setup-node@v6",
		bun: "oven-sh/setup-bun@v2",
	};

	await writeTemplate(
		join(tmplDir, "version.yml"),
		join(workflowsDir, "version.yml"),
		{
			__INSTALL__: installCommands[pm],
			__RUNTIME_ACTION__: runtimeActions[pm],
		},
		rootDir,
	);

	p.outro("Unorepo initialized!");
}

/** Try to extract { owner, name } from a package.json repository field. */
function getRepoFromPackageJson(
	pkgPath: string,
): { owner: string; name: string } | null {
	if (!existsSync(pkgPath)) return null;
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		let repoStr: string | undefined;
		if (typeof pkg.repository === "string") {
			repoStr = pkg.repository;
		} else if (typeof pkg.repository?.url === "string") {
			repoStr = pkg.repository.url;
		}
		if (!repoStr) return null;
		// Match patterns: github:owner/repo, owner/repo, https://github.com/owner/repo[.git]
		const match = repoStr.match(
			/(?:github:|github\.com[/:])([-\w.]+)\/([-\w.]+?)(?:\.git)?$/i,
		);
		if (match) return { owner: match[1], name: match[2] };
	} catch {
		// ignore malformed package.json
	}
	return null;
}

/** Copy a template file to dest, skipping with a warning if it already exists. */
async function writeTemplate(
	tplpath: string,
	destPath: string,
	replacements: Record<string, string> = {},
	rootDir: string,
): Promise<void> {
	const label = relative(rootDir, destPath);
	try {
		await fs.access(destPath);
		p.log.warning(`${label} already exists`);
	} catch {
		let content = readFileSync(tplpath, "utf-8");
		for (const [key, value] of Object.entries(replacements)) {
			content = content.replace(key, value);
		}
		await fs.writeFile(destPath, content, "utf-8");
		p.log.success(`Created ${label}`);
	}
}
