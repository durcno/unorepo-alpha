import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	applyVersionBump,
	type Changenote,
	type ChangenoteCommit,
	consumeChangenotes,
	consumePrepareConfig,
	createGitOps,
	loadConfig,
	readChangenotes,
	readPackageJson,
	readPrepareConfig,
	type VersionBump,
} from "unorepo-alpha";
import { CONFIG_FILE_NAME } from "../../const";

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
	const changenotes: (Changenote & { commit: ChangenoteCommit })[] = [];

	for (const cn of allChangenotes) {
		const meta = await gitOps.getFileMeta(cn.filePath);
		changenotes.push({ ...cn, commit: meta });
	}

	// Read current package.json for package name and current version
	const pkgJsonPath = join(rootDir, "package.json");
	const pkgJson = readPackageJson(pkgJsonPath);

	// Build the VersionBump from prepare config + changenotes
	const bumps = new Set(changenotes.map((cn) => cn.bump));
	const bump = ["major", "minor", "patch"].find((b) =>
		bumps.has(b as Changenote["bump"]),
	) as VersionBump["bump"];

	const versionBump: VersionBump = {
		packageName: pkgJson.name,
		currentVersion: pkgJson.version,
		newVersion,
		bump,
	};

	// Track all files that are created, edited, or deleted
	const trackedFiles: string[] = [pkgJsonPath];

	applyVersionBump(versionBump, pkgJsonPath);
	p.log.success(
		`Updated ${relative(rootDir, pkgJsonPath)} - version: ${newVersion}`,
	);

	// Generate changelog
	const changelog = config.changelog.generator(
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
			trackedFiles.push(...paths);
		}
		p.log.success("Changelog saved");
	}

	// Remove consumed changenote files and prepare config
	consumeChangenotes(allChangenotes);
	p.log.success(`Used ${allChangenotes.length} changenote(s)`);
	for (const cn of allChangenotes) {
		trackedFiles.push(cn.filePath);
	}

	// Remove prepare config
	await consumePrepareConfig(changenotesDir);
	trackedFiles.push(join(changenotesDir, "prepare.json"));

	if (
		options.commit ||
		options.tag ||
		options.push ||
		options.publish ||
		options.release
	) {
		await gitOps.ensureGitIdentity();
		await gitOps.add(trackedFiles);
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
