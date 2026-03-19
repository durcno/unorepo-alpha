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

/** Detect indentation from JSON content */
export function detectIndentation(content: string): string | number {
	// Look for indented lines in the JSON
	const match = content.match(/\n([ \t]+)["'{]/);
	if (!match) {
		return 2; // default to 2 spaces
	}

	const indent = match[1];

	// Check if it's tabs
	if (indent.includes("\t")) {
		return "\t";
	}

	// Otherwise it's spaces, return the count
	return indent.length;
}
