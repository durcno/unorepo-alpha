import * as p from "@clack/prompts";
import {
	getConfigValue,
	loadUserConfig,
	removeConfigValue,
	setConfigValue,
} from "unorepo-alpha";

export async function configCommand(
	action: "view" | "set" | "get" | "remove",
	key?: string,
	value?: string,
): Promise<void> {
	switch (action) {
		case "view": {
			const config = await loadUserConfig();
			if (Object.keys(config).length === 0) {
				p.log.message(
					"No configuration found. Run 'unorepo config set <key> <value>' to add settings.",
				);
			} else {
				for (const [k, v] of Object.entries(config)) {
					p.log.message(`${k}: ${v}`);
				}
			}
			break;
		}

		case "set": {
			const setKey = key as string;
			const setValue = value as string;
			await setConfigValue(setKey, setValue);
			p.log.success(`Config updated: ${setKey} = ${setValue}`);
			break;
		}

		case "get": {
			const getKey = key as string;
			const result = await getConfigValue(getKey);
			if (result === undefined) {
				p.log.message(`No value found for key: ${getKey}`);
			} else {
				p.log.message(`${getKey}: ${result}`);
			}
			break;
		}

		case "remove": {
			const removeKey = key as string;
			await removeConfigValue(removeKey);
			p.log.success(`Config removed: ${removeKey}`);
			break;
		}
	}
}
