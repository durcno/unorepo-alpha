import type { BumpType, ChangelogGenerator } from "./types";

export interface ChangelogGeneratorOptions {
	/**
	 * Custom markdown header format.
	 * Supports template variables:
	 * - {packageName}: The package name
	 * - {version}: The new version
	 *
	 * @default "# {packageName}@{version}"
	 *
	 * @example
	 * ```ts
	 * headerFormat: "## Release {packageName} v{version}"
	 * ```
	 */
	headerFormat?: string;

	/**
	 * Custom section header format for bump types.
	 * Supports template variables:
	 * - {label}: The bump type label (e.g., "Major Changes")
	 *
	 * @default "## {label}"
	 *
	 * @example
	 * ```ts
	 * sectionHeaderFormat: "### {label}"
	 * ```
	 */
	sectionHeaderFormat?: string;

	/**
	 * Custom labels for bump types.
	 * Replaces default labels like "Major Changes", "Minor Changes", etc.
	 *
	 * @example
	 * ```ts
	 * bumpLabels: {
	 *   major: "Breaking Changes",
	 *   minor: "Features",
	 *   patch: "Bugfixes"
	 * }
	 * ```
	 */
	bumpLabels?: Partial<Record<BumpType, string>>;

	/**
	 * Custom repository URL format.
	 * Supports template variables:
	 * - {owner}: Repository owner
	 * - {name}: Repository name
	 * - {repoUrl}: Full repository URL
	 *
	 * @default "https://github.com/{owner}/{name}"
	 *
	 * @example
	 * ```ts
	 * repositoryUrl: "https://gitlab.com/{owner}/{name}"
	 * ```
	 */
	repositoryUrl?: string;
}

/**
 * Creates a customizable changelog generator with configurable formatting options.
 *
 * @param options Configuration for the changelog generator
 * @returns A ChangelogGenerator plugin function
 *
 * @example
 * ```ts
 * const generator = createChangelogGenerator({
 *   headerFormat: "## Release {packageName} v{version}",
 *   bumpLabels: {
 *     major: "Breaking Changes",
 *     minor: "Features",
 *     patch: "Bugfixes"
 *   }
 * });
 * ```
 */
export function createChangelogGenerator(
	options: ChangelogGeneratorOptions = {},
): ChangelogGenerator {
	const {
		headerFormat = "# {packageName}@{version}",
		sectionHeaderFormat = "## {label}",
		bumpLabels = {},
		repositoryUrl = "https://github.com/{owner}/{name}",
	} = options;

	return (versionBump, changenotes, config) => {
		const { repository } = config;
		const lines: string[] = [];

		// Format header with template variables
		const header = headerFormat
			.replace("{packageName}", versionBump.packageName)
			.replace("{version}", versionBump.newVersion);
		lines.push(header);
		lines.push("");

		// Group changenotes by bump type
		const groups = new Map<string, typeof changenotes>();
		for (const cn of changenotes) {
			const cnType = cn.meta.bump;
			if (!cnType) continue;
			const label = getBumpLabel(cnType, bumpLabels);
			if (!groups.has(label)) groups.set(label, []);
			groups.get(label)?.push(cn);
		}

		// Format repository URL
		const repoUrl = repositoryUrl
			.replace("{owner}", repository.owner)
			.replace("{name}", repository.name);

		for (const [label, changenotes] of groups) {
			const sectionHeader = sectionHeaderFormat.replace("{label}", label);
			lines.push(sectionHeader);

			for (const cn of changenotes) {
				const { meta } = cn;
				lines.push("");

				const commit = cn.commit?.hash
					? `[${cn.commit.hash.slice(0, 7)}](${repoUrl}/commit/${cn.commit.hash})`
					: "";

				let pull = "";
				if (meta.pr) {
					pull = ` - [PR#${meta.pr}](${repoUrl}/pull/${meta.pr})`;
				} else if (cn.commit) {
					const firstLine = cn.commit.message?.split("\n")[0];
					const prMatch = firstLine?.match(/^#(\d+)/);
					if (prMatch) {
						pull = ` - [PR#${prMatch[1]}](${repoUrl}/pull/${prMatch[1]})`;
					}
				}

				let thanks = "";
				if (meta.author) {
					thanks = ` - Thanks to [@${meta.author}](https://github.com/${meta.author}) !`;
				} else if (cn.commit?.authors && cn.commit.authors.length > 0) {
					thanks = ` - Thanks to ${cn.commit.authors
						.map((ca) => `[${ca.name}](mailto:${ca.email})`)
						.join(", ")} !`;
				}

				// First line: commit - pr - thanks
				lines.push(`- ${commit}${pull}${thanks}`);
				lines.push("");
				lines.push(`  > ${cn.title}`);

				// Add body details if present
				const trimmedBody = cn.body.trim();
				if (trimmedBody) {
					lines.push("");
					lines.push(`  ${trimmedBody.split("\n").join("\n  ")}`);
				}
			}

			lines.push("");
		}

		return lines.join("\n").trimEnd();
	};
}

function getBumpLabel(
	bump: BumpType,
	customLabels: Partial<Record<BumpType, string>> = {},
): string {
	if (customLabels[bump]) {
		return customLabels[bump];
	}
	switch (bump) {
		case "major":
			return "Major Changes";
		case "minor":
			return "Minor Changes";
		case "patch":
			return "Patch Changes";
		default:
			return "Changes";
	}
}
