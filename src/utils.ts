import fs from "node:fs";
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

/** Read a package.json and return its name and version */
export function readPackageJson(pkgPath: string): {
	name: string;
	version: string;
} {
	const content = fs.readFileSync(pkgPath, "utf-8");
	const pkg = JSON.parse(content);
	if (!pkg.name || !pkg.version) {
		throw new Error(`Invalid package.json: ${pkgPath}`);
	}
	return pkg;
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
