import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	calculateVersionBump,
	createGitOps,
	formatFiles,
	loadConfig,
	type PkgFileAbsPath,
	readChangenotes,
	writePrepareConfig,
} from "unorepo-alpha";
import { CONFIG_FILE_NAME } from "../../const";
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
	const config = await loadConfig(join(rootDir, CONFIG_FILE_NAME));
	const pkgJsonPath = join(rootDir, config.package) as PkgFileAbsPath;
	const changenoteDir = join(rootDir, ".changenotes");

	p.intro("Preparing for version bump");

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

	// Calculate version bump
	const partialConfig = isPreType
		? { type: type as PreReleaseType, tag: preTag as string }
		: { type: "release" as const };
	const versionBump = await calculateVersionBump(
		pkgJsonPath as PkgFileAbsPath,
		changenotes,
		rootDir,
		partialConfig,
	);
	const { packageName, newVersion } = versionBump;

	const confirm = await p.confirm({
		message: `Prepare ${versionBump.packageName}: ${versionBump.currentVersion} → ${versionBump.newVersion} ?`,
	});

	if (p.isCancel(confirm) || !confirm) {
		p.cancel("Cancelled");
		process.exit(0);
	}

	const prepareConfig: PrepareConfig = {
		newVersion,
		try: 1,
	};
	const filePath = await writePrepareConfig(changenoteDir, prepareConfig);
	p.log.success(`Wrote prepare config: ${relative(rootDir, filePath)}`);

	// Run formatter plugins on the created file
	await formatFiles([filePath], config, rootDir);

	if (options.commit || options.push) {
		const gitOps = createGitOps(rootDir);
		await gitOps.add([".changenotes/prepare.json"]);
		const message = `chore: prepare ${packageName}@${newVersion}`;
		await gitOps.commit(message);
		const branch = await gitOps.currentBranch();
		p.log.success(`Committed → ${message} → ${branch}`);

		if (options.push) {
			p.log.success(`Pushing → ${branch} → origin/${branch}`);
			await gitOps.push();
			p.log.success(`Pushed → ${branch} → origin/${branch}`);
			p.outro(`Done. ${packageName}@${newVersion} on the way.`);
			process.exit(0);
		}
	}
}
