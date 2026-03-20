import { type SimpleGit, simpleGit } from "simple-git";
import type { ChangenoteCommit, CommitAuthor } from "./types";

/** Create a git operations instance for a repository */
export function createGitOps(repoDir: string = ".") {
	const git: SimpleGit = simpleGit(repoDir);

	return {
		async currentBranch() {
			const print = await git.raw(["branch", "--show-current"]);
			return print.trim();
		},

		async getFileAuthors(file: string): Promise<CommitAuthor[]> {
			try {
				const log = await git.log({
					file: file,
					format: { name: "%an", email: "%ae" },
				});

				// Deduplicate by email
				const seen = new Set<string>();
				const commitAuthors: CommitAuthor[] = [];

				// reverse the order of the commits to get the most recent first
				for (const entry of log.all.toReversed()) {
					if (!seen.has(entry.email)) {
						seen.add(entry.email);
						commitAuthors.push({
							name: entry.name,
							email: entry.email,
						});
					}
				}

				return commitAuthors;
			} catch {
				return [];
			}
		},

		async getFileAddCommit(filePath: string): Promise<ChangenoteCommit> {
			const rawLog = await git.raw([
				"log",
				"--diff-filter=A",
				"--follow",
				`--format={"hash": "%H", "subject": "%s"}`,
				filePath,
			]);

			const log = JSON.parse(rawLog.trim());
			const authors = await this.getFileAuthors(filePath);

			return {
				hash: log.hash,
				subject: log.subject,
				authors: authors,
			};
		},

		async getStagedFiles(pattern?: RegExp): Promise<string[]> {
			try {
				const diff = await git.diff(["--staged", "--name-only"]);
				return diff
					.trim()
					.split("\n")
					.filter((f) => f && (!pattern || pattern.test(f)));
			} catch {
				return [];
			}
		},

		async getUnstagedFiles(pattern?: RegExp): Promise<string[]> {
			try {
				const diff = await git.diff(["--name-only"]);
				return diff
					.trim()
					.split("\n")
					.filter((f) => f && (!pattern || pattern.test(f)));
			} catch {
				return [];
			}
		},

		async add(file: string[]): Promise<void> {
			await git.add(file);
		},

		async commit(message: string): Promise<void> {
			await git.commit(message);
		},

		async tag(name: string, message?: string): Promise<void> {
			if (message) {
				await git.addAnnotatedTag(name, message);
			} else {
				await git.addTag(name);
			}
		},

		async push(branch?: string): Promise<void> {
			await git.push("origin", branch);
		},

		async pushSetUpstream(branch: string): Promise<void> {
			await git.raw(["push", "--set-upstream", "origin", branch]);
		},

		async pushTags(branch?: string): Promise<void> {
			await git.push("origin", branch, ["--tags"]);
		},

		async ensureGitIdentity(): Promise<void> {
			const [nameResult, emailResult] = await Promise.all([
				git.getConfig("user.name"),
				git.getConfig("user.email"),
			]);
			if (!nameResult.value) {
				await git.addConfig("user.name", "github-actions[bot]");
			}
			if (!emailResult.value) {
				await git.addConfig(
					"user.email",
					"41898282+github-actions[bot]@users.noreply.github.com",
				);
			}
		},
	};
}
