import fs from "node:fs/promises";
import { relative } from "node:path";
import process from "node:process";
import { simpleGit } from "simple-git";
import { updateFrontmatter } from "unorepo-alpha";

export async function tagCommand(): Promise<void> {
	const base = process.env.BASE_REF;
	const pr = process.env.PR_NUMBER;
	const author = process.env.PR_LOGIN;

	if (!pr || !base || !author) {
		throw new Error(
			"BASE_REF, PR_NUMBER, and PR_LOGIN environment variables are required",
		);
	}

	const git = simpleGit();
	// make sure the remote reference for the base branch exists locally
	await git.fetch("origin", base);

	// compute list of changenote files added or modified in this PR
	const diff = await git.diff([
		"--name-only",
		"--diff-filter=AM",
		`origin/${base}...HEAD`,
		"--",
		".changenotes/*.md",
	]);

	if (!diff.trim()) {
		console.log("No changenote files found in this PR");
		return;
	}

	const files = diff.trim().split("\n");

	for (const file of files) {
		let content = await fs.readFile(file, "utf-8");

		const updates: Record<string, unknown> = { pr: Number(pr), author };

		content = updateFrontmatter(content, updates);
		await fs.writeFile(file, content);
		console.log(
			`Added pr:${pr} and author:${author} to ${relative(process.cwd(), file)}`,
		);
	}

	// stage any modified files and commit/push if necessary
	await git.add(files);
	const status = await git.status();
	if (status.staged.length > 0) {
		await git.commit(`chore: add PR and author to changenote`);
		await git.push();
	} else {
		console.log("No changes to commit");
	}
}
