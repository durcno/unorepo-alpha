import { join, relative } from "node:path";
import * as p from "@clack/prompts";
import {
	type ChangenoteMetadata,
	getConfigValue,
	writeChangenote,
} from "unorepo-alpha";

export async function changeCommand(): Promise<void> {
	const rootDir = process.cwd();

	p.intro("Adding a new changenote!");

	const bump = await p.select({
		message: "Bump type?",
		options: [
			{ value: "patch" as const, label: "patch", hint: "Bug fixes" },
			{ value: "minor" as const, label: "minor", hint: "New features" },
			{ value: "major" as const, label: "major", hint: "Breaking changes" },
		],
	});

	if (p.isCancel(bump)) {
		p.cancel("Cancelled");
		process.exit(0);
	}

	const title = await p.text({
		message: "Title of the change?",
		placeholder: "feat: Short description of what changed...",
		validate: (val) => (val?.trim() ? undefined : "Title is required"),
	});

	if (p.isCancel(title)) {
		p.cancel("Cancelled");
		process.exit(0);
	}

	const id = generateId();

	const frontmatter: ChangenoteMetadata = { bump };

	const author = await getConfigValue("githubUsername");
	if (author) frontmatter.author = author;

	const csPath = await writeChangenote(
		join(rootDir, ".changenotes"),
		id,
		frontmatter,
		title,
		"",
	);

	p.log.success(`Changenote added! ${relative(rootDir, csPath)}`);
	p.log.step("Add a body if needed.");
	p.log.step(`Stage your changes.`);
	p.outro("Run `unorepo commit` when ready to commit.");
}

function generateId(): string {
	const adjectives = [
		"brave",
		"calm",
		"dark",
		"eager",
		"fair",
		"gentle",
		"happy",
		"icy",
		"jolly",
		"keen",
		"lively",
		"merry",
		"noble",
		"odd",
		"proud",
		"quick",
		"rare",
		"shy",
		"tall",
		"warm",
	];
	const colors = [
		"amber",
		"azure",
		"coral",
		"crimson",
		"ember",
		"fern",
		"frost",
		"gold",
		"jade",
		"lemon",
		"lilac",
		"maple",
		"ocean",
		"onyx",
		"pearl",
		"rose",
		"ruby",
		"sage",
		"slate",
		"teal",
	];
	const nouns = [
		"fox",
		"bear",
		"deer",
		"wolf",
		"hawk",
		"lynx",
		"owl",
		"pike",
		"crow",
		"dove",
		"frog",
		"goat",
		"hare",
		"ibis",
		"jay",
		"kite",
		"lark",
		"mole",
		"newt",
		"orca",
	];

	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const color = colors[Math.floor(Math.random() * colors.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];

	return `${adj}-${color}-${noun}`;
}
