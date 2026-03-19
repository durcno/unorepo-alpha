import {
	createChangelogGenerator,
	createChangelogSaver,
	createGitHubReleaser,
	createNpmPublisher,
	defineConfig,
} from "unorepo-alpha";

export default defineConfig({
	package: "package.json",
	repository: {
		owner: "durcno",
		name: "unorepo-alpha",
	},
	changelog: {
		generator: createChangelogGenerator({
			githubToken: process.env.GITHUB_TOKEN!,
		}),
		saver: createChangelogSaver({
			filepath: "changelogs/v{version}.md",
		}),
	},
	publishers: [
		createNpmPublisher({
			provenance: true,
		}),
	],
	releasers: [
		createGitHubReleaser({
			token: process.env.GITHUB_TOKEN!,
		}),
	],
});
