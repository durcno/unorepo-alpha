import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	calculateVersionBump,
	createGitOps,
	readChangenotes,
	writePrepareConfig,
} from "unorepo-alpha";
import type { PrepareConfig } from "../../types";

const VALID_TYPES = [
	"release",
	"prerelease",
	"prepatch",
	"preminor",
	"premajor",
] as const;
type ReleaseType = (typeof VALID_TYPES)[number];
type PreReleaseType = Exclude<ReleaseType, "release">;

const PRE_TYPES: readonly string[] = [
	"prerelease",
	"prepatch",
	"preminor",
	"premajor",
] satisfies PreReleaseType[];

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

	if (!VALID_TYPES.includes(type as ReleaseType)) {
		p.log.error(
			`Invalid type "${type}". Must be one of: ${VALID_TYPES.join(", ")}`,
		);
		process.exit(1);
	}

	// Validate that there are changenotes at all
	const changenotes = await readChangenotes(changenoteDir);
	if (changenotes.length === 0) {
		p.log.warning("No changenotes found.");
		p.outro("Nothing to version.");
		return;
	}

	const isPreType = PRE_TYPES.includes(type);
	const preTag = isPreType ? (tag ?? "alpha") : undefined;

	if (isPreType) {
		p.log.info(`Preparing a "${type}" with tag "${preTag}"`);
	} else {
		p.log.info("Preparing a stable release");
	}

	// Calculate version bump
	const partialConfig = isPreType
		? { type: type as PreReleaseType, tag: preTag as string }
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
		message: `Prepare ${isPreType ? `${type} (${preTag})` : "release"} with version ${versionBump.newVersion}?`,
	});

	if (p.isCancel(confirm) || !confirm) {
		p.cancel("Cancelled");
		process.exit(0);
	}

	const config: PrepareConfig = { newVersion: versionBump.newVersion, try: 1 };
	const filePath = await writePrepareConfig(changenoteDir, config);
	p.log.success(`Wrote prepare config: ${relative(rootDir, filePath)}`);

	if (options.commit || options.push) {
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
