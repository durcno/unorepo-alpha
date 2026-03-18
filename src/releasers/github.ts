import { Octokit } from "@octokit/rest";
import * as semver from "semver";
import type { ReleaserPlugin } from "../types";

export interface GitHubReleaserOptions {
	/** GitHub token for authentication */
	token: string;
}

export function createGitHubReleaser(
	options: GitHubReleaserOptions,
): ReleaserPlugin {
	const octokit = new Octokit({ auth: options.token });

	return async ({ versionBump, tagName, changelog, config }): Promise<void> => {
		const releaseName = `${versionBump.packageName}@${versionBump.newVersion}`;

		await octokit.repos.createRelease({
			owner: config.repository.owner,
			repo: config.repository.name,
			tag_name: tagName,
			name: releaseName,
			body: changelog,
			draft: false,
			prerelease:
				semver.parse(versionBump.newVersion)?.prerelease !== undefined,
		});
	};
}
