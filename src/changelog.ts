import type { BumpType, ChangelogGenerator } from "./types";

/** Default markdown changelog generator */
export const changelogGenerator: ChangelogGenerator = (
	versionBump,
	changenotes,
	config,
) => {
	const { repository } = config;
	const lines: string[] = [];
	lines.push(`# ${versionBump.packageName}@${versionBump.newVersion}`);
	lines.push("");

	// Group changenotes by bump type
	const groups = new Map<string, typeof changenotes>();
	for (const cn of changenotes) {
		const cnType = cn.bump;
		if (!cnType) continue;
		const label = getBumpLabel(cnType);
		if (!groups.has(label)) groups.set(label, []);
		groups.get(label)?.push(cn);
	}

	for (const [label, changenotes] of groups) {
		lines.push(`## ${label}`);
		lines.push("");

		for (const cn of changenotes) {
			const repoUrl = `https://github.com/${repository.owner}/${repository.name}`;
			const commit = cn.commit?.commitHash
				? `[${cn.commit.commitHash.slice(0, 7)}](${repoUrl}/commit/${cn.commit.commitHash})`
				: "";

			let pull = "";
			if (cn.pr) {
				pull = `- [PR#${cn.pr}](${repoUrl}/pull/${cn.pr})`;
			}
			let thanks = "";
			if (cn.author) {
				thanks = ` Thanks to [@${cn.author}](https://github.com/${cn.author}) !`;
			} else if (
				cn.commit?.commitAuthors &&
				cn.commit.commitAuthors.length > 0
			) {
				thanks = ` Thanks to ${cn.commit.commitAuthors
					.map((ca) => `[${ca.name}](mailto:${ca.email})`)
					.join(", ")} !`;
			}

			// First line: commit hash + pr link + thanks
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

function getBumpLabel(bump: BumpType): string {
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
