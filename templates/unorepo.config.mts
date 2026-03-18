import {
	createChangelogGenerator,
	createGitHubReleaser,
	createNpmPublisher,
	defineConfig,
} from "unorepo-alpha";

export default defineConfig({
	repository: {
		owner: "__OWNER__",
		name: "__REPO__",
	},
	changelog: {
		generator: createChangelogGenerator(),
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
