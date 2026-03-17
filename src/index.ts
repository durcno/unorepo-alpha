import "localstorage-polyfill";
import type { UnorepoConfig } from "./types";

/** Type-safe helper for defining a Unorepo configuration object. */
export function defineConfig(config: UnorepoConfig): UnorepoConfig {
	return config;
}

export { changelogGenerator } from "./changelog";
export {
	consumePrepareConfig,
	loadConfig,
	parseChangenoteContent,
	parseChangenotefile,
	parseFrontmatter,
	readChangenotes,
	readPrepareConfig,
	updateFrontmatter,
	writeChangenote,
	writePrepareConfig,
} from "./changenote";
export { createGitOps } from "./git";
export { calculateVersionBump } from "./prepare";
export type { NpmPublisherOptions } from "./publishers/npm";
export { createNpmPublisher } from "./publishers/npm";
export type { GitHubReleaserOptions } from "./releasers/github";
export { createGitHubReleaser } from "./releasers/github";
export type { ChangelogSaverOptions } from "./saver";
export { createChangelogSaver } from "./saver";
export type {
	BumpType,
	ChangelogGenerator,
	ChangelogSaver,
	Changenote,
	ChangenoteCommit,
	CommitAuthor,
	PrepareConfig,
	PublisherPlugin,
	ReleaserPlugin,
	UnorepoConfig,
	VersionBump,
} from "./types";
export { readPackageJson } from "./utils";
export {
	applyVersionBump,
	consumeChangenotes,
} from "./version";
