import {
	changelogGenerator,
	createChangelogSaver,
	createGitHubReleaser,
	createNpmPublisher,
	defineConfig,
} from "unorepo-alpha";

export default defineConfig({
	repository: {
		owner: "durcno",
		name: "unorepo-alpha",
	},
	changelog: {
		generator: changelogGenerator,
		saver: createChangelogSaver({
			filepath: "changelogs/v{version}.md",
		}),
	},
	publishers: [
		createNpmPublisher({
			env: {
				NPM_TOKEN: process.env.NPM_TOKEN!,
			},
			provenance: true,
		}),
	],
	releasers: [
		createGitHubReleaser({
			token: process.env.GITHUB_TOKEN!,
		}),
	],
});
