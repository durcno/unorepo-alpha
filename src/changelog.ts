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
		const cnType = cn.meta.bump;
		if (!cnType) continue;
		const label = getBumpLabel(cnType);
		if (!groups.has(label)) groups.set(label, []);
		groups.get(label)?.push(cn);
	}

	for (const [label, changenotes] of groups) {
		lines.push(`## ${label}`);

		for (const cn of changenotes) {
			const { meta } = cn;
			lines.push("");

			const repoUrl = `https://github.com/${repository.owner}/${repository.name}`;
			const commit = cn.commit?.commitHash
				? `[${cn.commit.commitHash.slice(0, 7)}](${repoUrl}/commit/${cn.commit.commitHash})`
				: "";

			let pull = "";
			if (meta.pr) {
				pull = `- [PR#${meta.pr}](${repoUrl}/pull/${meta.pr})`;
			}
			let thanks = "";
			if (meta.author) {
				thanks = `- Thanks to [@${meta.author}](https://github.com/${meta.author}) !`;
			} else if (
				cn.commit?.commitAuthors &&
				cn.commit.commitAuthors.length > 0
			) {
				thanks = `- Thanks to ${cn.commit.commitAuthors
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
