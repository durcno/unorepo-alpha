import { join } from "node:path";
import * as semver from "semver";
import type {
	BumpType,
	Changenote,
	ChangenoteCommit,
	VersionBump,
} from "./types";
import { readPackageJson } from "./utils";

const BUMP_PRIORITY: Record<BumpType, number> = {
	major: 3,
	minor: 2,
	patch: 1,
};

/** Get the highest priority bump from a list */
function highestBump(bumps: BumpType[]): BumpType {
	let max: BumpType = "patch";
	for (const b of bumps) {
		if (BUMP_PRIORITY[b] > BUMP_PRIORITY[max]) {
			max = b;
		}
	}
	return max;
}

/** Calculate version bump from changenotes */
export async function calculateVersionBump(
	changenotes: (Changenote & { commit?: ChangenoteCommit })[],
	rootDir: string,
	prepareConfig?: { type: "release" } | { type: "prerelease"; tag: string },
): Promise<VersionBump> {
	const pkgJsonPath = join(rootDir, "package.json");
	const pkgJson = readPackageJson(pkgJsonPath);
	const currentVersion = pkgJson.version;
	const packageName = pkgJson.name;

	if (!currentVersion || !semver.valid(currentVersion)) {
		throw new Error(
			`Package "${packageName}" has invalid version: ${currentVersion}`,
		);
	}

	const bumps = new Set<BumpType>();
	for (const cn of changenotes) {
		bumps.add(cn.meta.bump);
	}
	const bump = highestBump(Array.from(bumps));

	let newVersion: string | null;

	if (prepareConfig?.type === "prerelease") {
		const tag = prepareConfig.tag;
		const pre = semver.prerelease(currentVersion);
		// If already a prerelease with the same tag, just increment the prerelease number
		if (pre && pre[0] === tag) {
			newVersion = semver.inc(currentVersion, "prerelease", tag);
		} else {
			newVersion = semver.inc(currentVersion, `pre${bump}`, tag);
		}
	} else {
		newVersion = semver.inc(currentVersion, bump);
	}

	if (!newVersion) {
		throw new Error(
			`Failed to increment version ${currentVersion} with bump ${bump}`,
		);
	}

	return {
		packageName,
		currentVersion,
		newVersion,
		bump,
	};
}
