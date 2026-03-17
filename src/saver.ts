import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { ChangelogSaver, VersionBump } from "./types";
import { escapePackageName } from "./utils";

export interface ChangelogSaverOptions {
	/**
	 * Filepath for saving the changelog.
	 * Can be a string (static path) or a function that receives the VersionBump
	 * and returns the filepath. Supports template variables:
	 * - {packageName}: The package name
	 * - {version}: The new version
	 *
	 * Examples:
	 * - "./CHANGELOG.md"
	 * - "./CHANGELOG-{packageName}.md"
	 * - (bump) => `./changelogs/{bump.packageName}-${bump.newVersion}.md`
	 */
	filepath: string | ((bump: VersionBump) => string);
}

/**
 * Creates a changelog saver that writes to the filesystem.
 *
 * @param options Configuration for the file saver
 * @returns A ChangelogSaver plugin function
 *
 * @example
 * ```ts
 * const saver = createChangelogSaver({ filepath: "./CHANGELOG.md" });
 *
 * // Or with dynamic filepath:
 * const saver = createChangelogSaver({
 *   filepath: (bump) => `./changelogs/CHANGELOG-${bump.packageName}.md`
 * });
 *
 * // Or with template variables:
 * const saver = createChangelogSaver({
 *   filepath: "./changelogs/CHANGELOG-{packageName}-{version}.md"
 * });
 * ```
 */
export function createChangelogSaver(
	options: ChangelogSaverOptions,
): ChangelogSaver {
	return async ({ changelog, versionBump, configDir }): Promise<string> => {
		// Resolve the filepath
		let filepath: string;
		if (typeof options.filepath === "function") {
			filepath = options.filepath(versionBump);
		} else {
			// Support simple template variable substitution
			filepath = options.filepath
				.replace("{packageName}", escapePackageName(versionBump.packageName))
				.replace("{version}", versionBump.newVersion);
		}

		// Resolve to absolute path using rootDir
		const absolutePath = filepath.startsWith("/")
			? filepath
			: `${configDir}/${filepath}`;

		// Ensure the directory exists
		const dir = dirname(absolutePath);
		await fs.mkdir(dir, { recursive: true });

		// Write the changelog
		await fs.writeFile(absolutePath, changelog, "utf-8");

		return absolutePath;
	};
}
