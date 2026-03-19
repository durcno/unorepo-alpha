import fs from "node:fs";
import type { DirtyFileAbsPath, Package, PkgFileAbsPath } from "./types";
import { detectIndentation } from "./utils";

/**
 * Read the name and version of a package from its package.json.
 *
 * @param pkgFilePath - The package descriptor (name + file path)
 * @param rootDir - The root directory of the monorepo
 * @returns Pack
 * @throws If the package.json is missing or has no valid name or version
 */
export function readPkg(pkgFilePath: PkgFileAbsPath, rootDir: string): Package {
	const content = fs.readFileSync(pkgFilePath, "utf-8");
	const pkg = JSON.parse(content);
	if (!pkg.name || !pkg.version) {
		throw new Error(`Invalid package.json: ${pkgFilePath}`);
	}
	return {
		name: pkg.name,
		version: pkg.version,
	};
}

/**
 * Update the version of a package in its package.json,
 * preserving the original indentation style.
 *
 * @param pkgFilePath - The package descriptor (name + file path)
 * @param rootDir - The root directory of the monorepo
 * @param newVersion - The new version string to set
 * @throws If the package.json is missing or cannot be written
 */
export function updatePkgVersion(
	pkgFilePath: PkgFileAbsPath,
	rootDir: string,
	newVersion: string,
): DirtyFileAbsPath[] {
	const packageJsonRaw = fs.readFileSync(pkgFilePath, "utf-8");
	const indent = detectIndentation(packageJsonRaw);

	const pkgJson = JSON.parse(packageJsonRaw);
	pkgJson.version = newVersion;

	fs.writeFileSync(
		pkgFilePath,
		`${JSON.stringify(pkgJson, null, indent)}\n`,
		"utf-8",
	);
	return [pkgFilePath as unknown as DirtyFileAbsPath];
}
