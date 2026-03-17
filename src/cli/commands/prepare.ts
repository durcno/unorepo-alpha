import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	calculateVersionBump,
	createGitOps,
	readChangenotes,
	writePrepareConfig,
} from "unorepo-alpha";
import type { PrepareConfig } from "../../types";

export interface PrepareCommandOptions {
	commit?: boolean;
	push?: boolean;
}

export async function prepareCommand(
	type: string,
	tag: string | undefined,
	options: PrepareCommandOptions = {},
): Promise<void> {
	const rootDir = process.cwd();
	const changenoteDir = join(rootDir, ".changenotes");

	p.intro("Preparing for a version bump");

	// Validate that there are changenotes at all
	const changenotes = await readChangenotes(changenoteDir);
	if (changenotes.length === 0) {
		p.log.warning("No changenotes found.");
		p.outro("Nothing to version.");
		return;
	}

	const isPrerelease = type === "prerelease";
	const preTag = isPrerelease ? (tag ?? "alpha") : undefined;

	if (isPrerelease) {
		p.log.info(`Preparing a "${preTag}" prerelease`);
	} else {
		p.log.info("Preparing a stable release");
	}

	// Calculate version bump
	const partialConfig = isPrerelease
		? { type: "prerelease" as const, tag: preTag as string }
		: { type: "release" as const };
	const versionBump = await calculateVersionBump(
		changenotes,
		rootDir,
		partialConfig,
	);

	p.log.message(
		`  ${versionBump.packageName}: ${versionBump.currentVersion} → ${versionBump.newVersion} (${versionBump.bump})`,
	);

	const confirm = await p.confirm({
		message: `Prepare ${isPrerelease ? `prerelease (${preTag})` : "release"} with version ${versionBump.newVersion}?`,
	});

	if (p.isCancel(confirm) || !confirm) {
		p.cancel("Cancelled");
		process.exit(0);
	}

	const config: PrepareConfig = { newVersion: versionBump.newVersion, try: 1 };
	const filePath = await writePrepareConfig(changenoteDir, config);
	p.log.success(`Wrote prepare config: ${relative(rootDir, filePath)}`);

	if (options.commit) {
		const gitOps = createGitOps(rootDir);
		await gitOps.add([".changenotes/prepare.json"]);
		const message = `chore: prepare ${versionBump.packageName}@${versionBump.newVersion}`;
		await gitOps.commit(message);
		p.log.success(`Committed: ${message}`);

		if (options.push) {
			await gitOps.push();
			p.log.success("Pushed to origin");
		}
	}

	p.outro(`Done. Version ${versionBump.newVersion} prepared.`);
}
