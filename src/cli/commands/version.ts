import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	type BumpType,
	type Changenote,
	type ChangenoteCommit,
	consumeChangenotes,
	consumePrepareConfig,
	createGitOps,
	formatFiles,
	loadConfig,
	type PkgFileAbsPath,
	readChangenotes,
	readPkg,
	readPrepareConfig,
	updatePkgVersion,
	type VersionBump,
} from "unorepo-alpha";
import { CONFIG_FILE_NAME } from "../../const";
import type { CommitAuthor, DirtyFileAbsPath } from "../../types";

export interface VersionCommandOptions {
	commit?: boolean;
	tag?: boolean;
	push?: boolean;
	publish?: boolean;
	release?: boolean;
}

export async function versionCommand(
	options: VersionCommandOptions = {},
): Promise<void> {
	const rootDir = process.cwd();
	const config = await loadConfig(join(rootDir, CONFIG_FILE_NAME));
	const pkgJsonPath = join(rootDir, config.package) as PkgFileAbsPath;

	p.intro("Reading prepare.json...");

	const changenotesDir = join(rootDir, ".changenotes");

	// Read the prepare config written by `prepare` command
	const prepareConfig = await readPrepareConfig(changenotesDir);

	if (!prepareConfig) {
		p.log.warning("No prepare config found.");
		p.log.info("Run `unorepo prepare <release|prerelease> [tag]` first.");
		p.outro("Nothing to do.");
		return;
	}

	const { newVersion } = prepareConfig;
	p.log.message(`Version: ${newVersion}`);

	const allChangenotes = await readChangenotes(changenotesDir);
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

	// Read current package.json for package name and current version

	// Build the VersionBump from prepare config + changenotes
	const bumps = new Set(changenotes.map((cn) => cn.meta.bump));
	const bump = ["major", "minor", "patch"].find((b) =>
		bumps.has(b as BumpType),
	) as BumpType;

	// Track all files that are created, edited, or deleted
	const dirtyFiles: DirtyFileAbsPath[] = [];

	dirtyFiles.push(...updatePkgVersion(pkgJsonPath, rootDir, newVersion));

	p.log.success(
		`Updated ${relative(rootDir, pkgJsonPath)} - version: ${newVersion}`,
	);

	const pkgJson = readPkg(pkgJsonPath, rootDir);
	const versionBump: VersionBump = {
		packageName: pkgJson.name,
		currentVersion: pkgJson.version,
		newVersion,
		bump,
	};

	// Generate changelog
	const changelog = await config.changelog.generator(
		versionBump,
		changenotes,
		config,
	);

	// Call changelog saver plugin if configured
	if (config.changelog?.saver) {
		const savedPaths = await config.changelog.saver({
			versionBump,
			changelog,
			configDir: rootDir,
		});
		if (savedPaths) {
			const paths = Array.isArray(savedPaths) ? savedPaths : [savedPaths];
			dirtyFiles.push(...paths);
		}
		p.log.success("Changelog saved");
	}

	// Remove consumed changenote files and prepare config
	consumeChangenotes(allChangenotes);
	p.log.success(`Used ${allChangenotes.length} changenote(s)`);
	for (const cn of allChangenotes) {
		dirtyFiles.push(cn.filePath as unknown as DirtyFileAbsPath);
	}

	// Remove prepare config
	await consumePrepareConfig(changenotesDir);
	dirtyFiles.push(
		join(changenotesDir, "prepare.json") as unknown as DirtyFileAbsPath,
	);

	// Run formatter plugins on created/modified files (deleted files are filtered out)
	await formatFiles(dirtyFiles, config, rootDir);

	if (
		options.commit ||
		options.tag ||
		options.push ||
		options.publish ||
		options.release
	) {
		await gitOps.ensureGitIdentity();
		await gitOps.add(dirtyFiles);
		const message = `Release ${pkgJson.name}@${newVersion}`;
		await gitOps.commit(message);
		p.log.success(`Committed: ${message}`);
	}

	const tagName = `${pkgJson.name}@${newVersion}`;

	if (options.tag || options.push || options.publish || options.release) {
		await gitOps.tag(tagName);
		p.log.success(`Created tag: ${tagName}`);
	}

	if (options.push || options.publish || options.release) {
		await gitOps.push();
		p.log.success("Pushed commit");
		await gitOps.pushTags();
		p.log.success("Pushed tag");
	}

	if (options.publish && config.publishers && config.publishers.length > 0) {
		for (const publisher of config.publishers) {
			await publisher({ pkgJsonPath, versionBump, config });
		}
		p.log.success("Publisher plugins ran");
	}

	if (options.release && config.releasers && config.releasers.length > 0) {
		for (const releaser of config.releasers) {
			await releaser({ versionBump, tagName, changelog, config });
		}
		p.log.success("Releaser plugins ran");
	}

	p.outro("Version bumped!");
}
