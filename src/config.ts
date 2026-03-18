import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".unorepo");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface UnorepoUserConfig {
	githubUsername?: string;
	[key: string]: string | undefined;
}

/** Read user configuration from ~/.unorepo/config.json */
export async function loadConfig(): Promise<UnorepoUserConfig> {
	try {
		const content = await fs.readFile(CONFIG_FILE, "utf-8");
		return JSON.parse(content);
	} catch (err) {
		// If file doesn't exist or is invalid JSON, return empty config
		if (err instanceof Error && "code" in err && err.code === "ENOENT") {
			return {};
		}
		throw err;
	}
}

/** Save user configuration to ~/.unorepo/config.json */
export async function saveConfig(config: UnorepoUserConfig): Promise<void> {
	await fs.mkdir(CONFIG_DIR, { recursive: true });
	await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/** Get a specific config value */
export async function getConfigValue(key: string): Promise<string | undefined> {
	const config = await loadConfig();
	return config[key];
}

/** Set a specific config value */
export async function setConfigValue(
	key: string,
	value: string,
): Promise<void> {
	const config = await loadConfig();
	config[key] = value;
	await saveConfig(config);
}

/** Remove a specific config value */
export async function removeConfigValue(key: string): Promise<void> {
	const config = await loadConfig();
	delete config[key];
	await saveConfig(config);
}
