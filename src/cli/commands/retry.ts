import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	createGitOps,
	readPrepareConfig,
	writePrepareConfig,
} from "unorepo-alpha";

export interface RetryCommandOptions {
	commit?: boolean;
	push?: boolean;
}

export async function retryCommand(
	options: RetryCommandOptions = {},
): Promise<void> {
	const rootDir = process.cwd();
	const changenoteDir = join(rootDir, ".changenotes");

	p.intro("Retrying prepare");

	const existing = await readPrepareConfig(changenoteDir);
	if (!existing) {
		p.log.error("No prepare.json found. Run `unorepo prepare` first.");
		process.exit(1);
	}

	const currentTry = existing.try ?? 1;
	const nextTry = currentTry + 1;
	const config = { ...existing, try: nextTry };

	const filePath = await writePrepareConfig(changenoteDir, config);
	p.log.success(
		`Updated prepare config (try: ${nextTry}): ${relative(rootDir, filePath)}`,
	);

	if (options.commit || options.push) {
		const gitOps = createGitOps(rootDir);
		await gitOps.add([".changenotes/prepare.json"]);
		const message = `chore: retry prepare ${existing.newVersion} (try ${nextTry})`;
		await gitOps.commit(message);
		p.log.success(`Committed: ${message}`);

		if (options.push) {
			await gitOps.push();
			p.log.success("Pushed to origin");
		}
	}

	p.outro(`Done. Retry ${nextTry} prepared.`);
}
