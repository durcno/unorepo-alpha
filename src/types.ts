/** A package in the monorepo */
export type Package = {
	/** Package name */
	name: string;
	/** Package version */
	version: string;
};

/** Branded string type representing a package file path */
export type PkgFileAbsPath = string & { readonly __brand: "PkgFileAbsPath" };

/** Branded string type representing a dirty file path */
export type DirtyFileAbsPath = string & {
	readonly __brand: "DirtyFileAbsPath";
};

/** Semantic version bump type */
export type BumpType = "major" | "minor" | "patch";

/** Parsed changenote from a markdown file */
export type Changenote = {
	/** Unique ID derived from the filename (without extension) */
	id: string;
	/** YAML frontmatter metadata */
	meta: ChangenoteMetadata;
	/** Heading from the changenote markdown */
	title: string;
	/** Markdown body content after the title heading */
	body: string;
	/** Relative file path to the changenote markdown file */
	filePath: string;
};

export type ChangenoteMetadata = {
	/** Semantic versioning bump information */
	bump: BumpType;
};

/** Commit metadata extracted from git history */
export interface ChangenoteCommit {
	/** Commit hash that introduced the changenote file */
	hash?: string;
	/** Commit message for the changenote file */
	message?: string;
	/** Contributors who authored/edited the changenote file */
	authors: CommitAuthor[];
}

/** A contributor extracted from git history */
export interface CommitAuthor {
	name: string;
	email: string;
}

/** A resolved version bump for a single package */
export interface VersionBump {
	packageName: string;
	/** Current version from package.json */
	currentVersion: string;
	/** New version after applying the bump */
	newVersion: string;
	/** The highest bump type applied */
	bump: BumpType;
}

/** Prepare configuration written by the `prepare` command */
export type PrepareConfig = { newVersion: string; try?: number };

/**
 * A changelog generator plugin function.
 * Receives a VersionBump and returns formatted changelog content.
 */
export type ChangelogGenerator = (
	bump: VersionBump,
	changenotes: (Changenote & { commit: ChangenoteCommit })[],
	config: UnorepoConfig,
) => Promise<string>;

/**
 * A changelog saver plugin function.
 * Called before git commit during the version command.
 * Receives the generated changelog markdown and version bump info,
 * and is responsible for persisting the changelog in the codebase.
 */
export type ChangelogSaver = (props: {
	changelog: string;
	versionBump: VersionBump;
	configDir: string;
}) =>
	| Promise<DirtyFileAbsPath | DirtyFileAbsPath[] | undefined>
	| DirtyFileAbsPath
	| DirtyFileAbsPath[]
	| undefined;

/**
 * A releaser plugin function.
 * Called after the git commit during the version command.
 * Responsible for publishing a release (e.g. creating a GitHub release).
 */
export type ReleaserPlugin = (props: {
	versionBump: VersionBump;
	tagName: string;
	changelog: string;
	config: UnorepoConfig;
}) => Promise<void> | void;

/**
 * A publisher plugin function.
 * Called after the git commit and tag during the version command.
 * Responsible for publishing the package to a registry (e.g. npm publish).
 */
export type PublisherPlugin = (props: {
	pkgJsonPath: string;
	versionBump: VersionBump;
	config: UnorepoConfig;
}) => Promise<void> | void;

/** Configuration for Unorepo */
export interface UnorepoConfig {
	/** Relative path to the package file */
	package: string;
	repository: {
		owner: string;
		name: string;
	};
	changelog: {
		/**
		 * A plugin that generates the changelog from changenotes.
		 */
		generator: ChangelogGenerator;
		/**`
		 * A plugin that saves the generated changelog in the codebase.
		 */
		saver?: ChangelogSaver;
	};
	/** List of publisher plugins called after git push during the version command */
	publishers?: PublisherPlugin[];
	/** List of releaser plugins called after releasers during the version command */
	releasers?: ReleaserPlugin[];
}
