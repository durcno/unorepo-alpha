import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, extname, join } from "node:path";
import type { FormatterPlugin, UnorepoConfig } from "./types";

export interface FormatterOptions {
	/** File extensions to handle (without leading dot, e.g. ["json", "md"]) */
	extensions: string[];
	/** The command to run (file paths are appended, e.g. "biome format --write") */
	command: string;
}

/**
 * Creates a formatter plugin that spawns an external command.
 *
 * Augments `PATH` with `node_modules/.bin` so the binary resolves
 * regardless of which package manager installed it.
 *
 * @example
 * ```ts
 * createFormatter({ extensions: ["json", "ts"], command: "biome format --write" })
 * createFormatter({ extensions: ["md", "yml"], command: "oxfmt" })
 * ```
 */
export function createFormatter(options: FormatterOptions): FormatterPlugin {
	return {
		extensions: options.extensions,
		format: (filePaths, rootDir) => {
			if (filePaths.length === 0) return;
			const binDir = join(rootDir, "node_modules", ".bin");
			execSync(`${options.command} ${filePaths.join(" ")}`, {
				stdio: "inherit",
				env: {
					...process.env,
					PATH: `${binDir}${delimiter}${process.env.PATH}`,
				},
			});
		},
	};
}

/**
 * Dispatch dirty files to matching formatters by extension.
 *
 * Filters out deleted files and routes each surviving file to
 * every formatter whose `extensions` list includes that file's extension.
 */
export async function formatFiles(
	filePaths: string[],
	config: UnorepoConfig,
	rootDir: string,
): Promise<void> {
	if (!config.formatters?.length || filePaths.length === 0) return;
	const existing = filePaths.filter((p) => existsSync(p));
	if (existing.length === 0) return;

	for (const formatter of config.formatters) {
		const extSet = new Set(formatter.extensions.map((e) => `.${e}`));
		const matched = existing.filter((f) => extSet.has(extname(f)));
		if (matched.length > 0) {
			await formatter.format(matched, rootDir);
		}
	}
}
