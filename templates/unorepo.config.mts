import {
	changelogGenerator,
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
		generator: changelogGenerator,
	},
	publishers: [
		createNpmPublisher({
			env: {
        NPM_TOKEN: process.env.NPM_TOKEN!
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
