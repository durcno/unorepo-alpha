import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import { createGitOps, parseChangenotefile } from "unorepo-alpha";

export async function commitCommand(): Promise<void> {
	const rootDir = process.cwd();

	p.intro("Commit staged changenote");

	const gitOps = createGitOps(rootDir);
	const [stagedChangenotes, unstagedChangenotes] = await Promise.all([
		gitOps.getStagedFiles(/^\.changenotes[\\/].+\.md$/),
		gitOps.getUnstagedFiles(/^\.changenotes[\\/].+\.md$/),
	]);

	if (unstagedChangenotes.length > 0) {
		p.log.error(
			`Unstaged changenote files detected: ${unstagedChangenotes.join(", ")}. Stage or discard them before committing.`,
		);
		process.exit(1);
	}

	if (stagedChangenotes.length === 0) {
		p.log.error(
			"No staged changenote files found. Stage a changenote file first.",
		);
		process.exit(1);
	}

	if (stagedChangenotes.length > 1) {
		p.log.warn(
			`Multiple staged changenotes found. Using: ${stagedChangenotes[0]}`,
		);
	}

	const changenoteFile = join(rootDir, stagedChangenotes[0]);
	const changenote = await parseChangenotefile(changenoteFile);

	p.log.info(`Commiting: "${relative(rootDir, changenoteFile)}"`);

	await gitOps.commit(changenote.title);

	p.outro(`Committed: "${changenote.title}"`);
}
