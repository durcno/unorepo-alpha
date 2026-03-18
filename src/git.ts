import { type SimpleGit, simpleGit } from "simple-git";
import type { ChangenoteCommit, CommitAuthor } from "./types";

/** Create a git operations instance for a repository */
export function createGitOps(repoDir: string = ".") {
	const git: SimpleGit = simpleGit(repoDir);

	return {
		async getFileCommitHash(path: string): Promise<string | undefined> {
			try {
				const log = await git.log({
					file: path,
					maxCount: 1,
					format: { hash: "%H" },
				});
				return log.latest?.hash;
			} catch {
				return undefined;
			}
		},

		async getFileAuthors(file: string): Promise<CommitAuthor[]> {
			try {
				const log = await git.log({
					file: file,
					format: { name: "%an", email: "%ae" },
				});

				// Deduplicate by email
				const seen = new Set<string>();
				const contributors: CommitAuthor[] = [];

				for (const entry of log.all) {
					const key = (entry as unknown as { email: string }).email;
					if (!seen.has(key)) {
						seen.add(key);
						contributors.push({
							name: (entry as unknown as { name: string }).name,
							email: key,
						});
					}
				}

				return contributors;
			} catch {
				return [];
			}
		},

		async getFileMeta(filePath: string): Promise<ChangenoteCommit> {
			const [log, contributors] = await Promise.all([
				git.log({
					file: filePath,
					maxCount: 1,
					format: { hash: "%H", message: "%s" },
				}),
				this.getFileAuthors(filePath),
			]);

			return {
				hash: log.latest?.hash,
				message: (log.latest as unknown as { message: string })?.message,
				authors: contributors,
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
