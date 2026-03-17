import { execSync } from "node:child_process";
import { dirname } from "node:path";
import type { PublisherPlugin } from "../types";

export interface NpmPublisherOptions {
	/** NPM registry URL (defaults to https://registry.npmjs.org) */
	registry?: string;
	/** Environment variables to pass to the npm publish command */
	env?: Record<string, string>;
	/** Custom publish arguments (e.g., ['--access', 'public'] for scoped packages) */
	args?: string[];
	/** Whether to enable GitHub Actions Provenance (SLSA attestation) (defaults to true) */
	provenance?: boolean;
}

/**
 * Creates an npm publisher plugin.
 * Publishes the package to the npm registry.
 * Supports GitHub Actions Provenance (SLSA attestation) for signed releases.
 */
export function createNpmPublisher(
	options: NpmPublisherOptions = {},
): PublisherPlugin {
	return async ({ pkgJsonPath, versionBump }): Promise<void> => {
		execSync("npm pack", {
			cwd: dirname(pkgJsonPath),
			stdio: "inherit",
		});

		const { registry, env = {}, args = [], provenance = true } = options;

		const publishArgs: string[] = ["publish"];

		if (registry) {
			publishArgs.push("--registry", registry);
		}

		if (provenance) {
			publishArgs.push("--provenance");
		}

		publishArgs.push(...args);

		const command = `npm ${publishArgs.join(" ")}`;

		try {
			execSync(command, {
				cwd: dirname(pkgJsonPath),
				stdio: "inherit",
				env: {
					...process.env,
					...env,
				},
			});
		} catch (error) {
			throw new Error(
				`Failed to publish ${versionBump.packageName}@${versionBump.newVersion} to npm: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};
}
