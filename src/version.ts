import fs from "node:fs";
import type { Changenote, VersionBump } from "./types";
import { readPackageJson } from "./utils";

/** Detect indentation from JSON content */
function detectIndentation(content: string): string | number {
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

/** Apply version bump to package.json */
export function applyVersionBump(
	versionBump: VersionBump,
	pkgJsonPath: string,
): void {
	const { newVersion } = versionBump;

	const packageJsonRaw = fs.readFileSync(pkgJsonPath, "utf-8");
	const indent = detectIndentation(packageJsonRaw);

	const pkgJson = readPackageJson(pkgJsonPath);
	pkgJson.version = newVersion;

	fs.writeFileSync(
		pkgJsonPath,
		`${JSON.stringify(pkgJson, null, indent)}\n`,
		"utf-8",
	);
}

/** Remove consumed changenote files */
export function consumeChangenotes(changenotes: Changenote[]): void {
	for (const cn of changenotes) {
		fs.unlinkSync(cn.filePath);
	}
}
