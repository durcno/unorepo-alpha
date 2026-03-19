import fs from "node:fs";
import type { Changenote, VersionBump } from "./types";
import { detectIndentation } from "./utils";

/** Apply version bump to package.json */
export function applyVersionBump(
	versionBump: VersionBump,
	pkgJsonPath: string,
): void {
	const { newVersion } = versionBump;

	const packageJsonRaw = fs.readFileSync(pkgJsonPath, "utf-8");
	const indent = detectIndentation(packageJsonRaw);

	const pkgJson = JSON.parse(packageJsonRaw);
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
