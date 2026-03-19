import type { UnorepoConfig } from "./types";

/** Load the Unorepo config */
export async function loadConfig(path: string): Promise<UnorepoConfig> {
	const module = await import(path);
	const config = module.default as UnorepoConfig | undefined;
	if (!config || typeof config !== "object") {
		throw new Error();
	}
	return config;
}

/**
 * Escape a package name to a safe file system name.
 *
 * "@myapp/core" → "myapp-core"
 *
 * "my-app" → "my-app"
 */
export function escapePackageName(name: string): string {
	return name.replace(/^@/, "").replace(/\//g, "-");
}
