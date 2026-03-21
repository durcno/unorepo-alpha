import {
	createChangelogGenerator,
	createChangelogSaver,
	createFormatter,
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
	formatters: [
		createFormatter({ extensions: ["json"], command: "biome format --write" }),
		createFormatter({ extensions: ["md"], command: "oxfmt" }),
	],
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
