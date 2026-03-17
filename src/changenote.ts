import fs from "node:fs/promises";
import { basename, join } from "node:path";
import { glob } from "glob";
import type { Heading, Root, Text } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { CONFIG_FILE_NAME } from "./const";
import type {
	BumpType,
	Changenote,
	PrepareConfig,
	UnorepoConfig,
} from "./types";

const VALID_BUMPS = new Set<string>(["major", "minor", "patch"]);

function isValidBump(value: string): value is BumpType {
	return VALID_BUMPS.has(value);
}

/** Parsed representation of a changenote markdown file. */
export interface ChangenoteMarkdown {
	/** YAML frontmatter key-value pairs */
	frontmatter: Record<string, unknown>;
	/** First `# Heading` text */
	title: string;
	/** Markdown body after the title heading (may be empty) */
	body: string;
}

/**
 * Extract only the YAML frontmatter from a changenote markdown string.
 *
 * Unlike {@link parse}, this does not require a `# Heading` title — useful
 * when you only need to inspect or update frontmatter fields.
 *
 * @throws if frontmatter is missing
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (!frontmatterMatch) {
		throw new Error("Changenote is missing frontmatter");
	}

	return (parseYaml(frontmatterMatch[1]) ?? {}) as Record<string, unknown>;
}

/**
 * Parse changenote markdown content into structured data.
 *
 * Expects a markdown string with YAML frontmatter delimited by `---` and
 * a first-level heading (`# Title`).
 *
 * @throws if frontmatter is missing or there is no `# Heading`
 */
export function parse(content: string): ChangenoteMarkdown {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (!frontmatterMatch) {
		throw new Error("Changenote is missing frontmatter");
	}

	const frontmatter = (parseYaml(frontmatterMatch[1]) ?? {}) as Record<
		string,
		unknown
	>;

	// Parse the markdown portion (everything after frontmatter)
	const markdownContent = content.slice(frontmatterMatch[0].length).trim();

	const tree = unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.parse(markdownContent) as Root;

	let title: string | undefined;
	let titleNodeIdx = -1;

	for (let i = 0; i < tree.children.length; i++) {
		const node = tree.children[i];
		if (node.type === "heading") {
			const heading = node as Heading;
			if (heading.depth === 1) {
				title = heading.children
					.filter((c): c is Text => c.type === "text")
					.map((c) => c.value)
					.join("");
				titleNodeIdx = i;
				break;
			}
		}
	}

	if (!title) {
		throw new Error("Changenote must have a title (# Heading)");
	}

	// Serialize the remaining nodes (after title) as the body
	const bodyTree: Root = {
		type: "root",
		children: tree.children.filter((_, i) => i !== titleNodeIdx),
	};
	const body = unified().use(remarkStringify).stringify(bodyTree).trim();

	return { frontmatter, title, body };
}

/**
 * Serialize a {@link ChangenoteMarkdown} back to a markdown string.
 */
export function stringifyChangenote(changenote: ChangenoteMarkdown): string {
	const yaml = stringifyYaml(changenote.frontmatter).trim();

	const lines = [];
	lines.push("---");
	lines.push(yaml);
	lines.push("---");
	lines.push(changenote.title);
	lines.push("===");
	lines.push(
		changenote.body.trim()
			? changenote.body.trim()
			: "<!-- Add a body here -->",
	);
	return lines.join("\n");
}

/**
 * Update frontmatter fields in an existing changenote markdown string.
 *
 * Uses the remark AST to locate and modify the YAML node, then
 * serializes the full document back to markdown — preserving
 * body content faithfully.
 *
 * @param content  Original markdown string
 * @param updates  Key-value pairs to merge into frontmatter
 * @returns        Updated markdown string
 * @throws         If no frontmatter is found
 */
export function updateFrontmatter(
	content: string,
	updates: Record<string, unknown>,
): string {
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.use(remarkStringify);

	const ast = processor.parse(content) as Root;

	let yamlNode: { type: string; value: string } | undefined;
	for (const node of ast.children) {
		if (node.type === "yaml") {
			yamlNode = node as unknown as { type: string; value: string };
			break;
		}
	}

	if (!yamlNode) {
		throw new Error("Changenote is missing frontmatter");
	}

	const data = (parseYaml(yamlNode.value) ?? {}) as Record<string, unknown>;
	Object.assign(data, updates);
	yamlNode.value = stringifyYaml(data).trim();

	return processor.stringify(ast);
}

/** Parse a single changenote markdown file */
export async function parseChangenotefile(
	filePath: string,
): Promise<Changenote> {
	const content = await fs.readFile(filePath, "utf-8");
	return parseChangenoteContent(content, filePath);
}

/** Parse changenote content from a string */
export function parseChangenoteContent(
	content: string,
	filePath: string,
): Changenote {
	const id = basename(filePath, ".md");

	let parsed: ReturnType<typeof parse>;
	try {
		parsed = parse(content);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("title")) {
			throw new Error(`Changenote ${filePath} must have a title (# Heading)`);
		}
		throw new Error(`Changenote ${filePath} is missing frontmatter`);
	}

	const { frontmatter, title, body } = parsed;

	const bump = frontmatter.bump;
	const pr = typeof frontmatter.pr === "number" ? frontmatter.pr : undefined;
	const author =
		typeof frontmatter.author === "string" ? frontmatter.author : undefined;

	if (typeof bump !== "string" || !isValidBump(bump)) {
		throw new Error(
			`Invalid bump type "${bump}" in ${filePath}. Must be major, minor, or patch.`,
		);
	}

	return {
		id,
		bump,
		author,
		title,
		body,
		...(pr != null && { pr }),
		filePath,
	};
}

/** Read all changenotes from the changenotes directory */
export async function readChangenotes(
	changenotesDir: string,
): Promise<Changenote[]> {
	const pattern = join(changenotesDir, "*.md");
	const files = await glob(pattern);

	if (files.length === 0) {
		return [];
	}

	const changenotes: Changenote[] = [];
	for (const file of files.sort()) {
		changenotes.push(await parseChangenotefile(file));
	}

	return changenotes;
}

/** Write a new changenote file */
export async function writeChangenote(
	changenotesDir: string,
	id: string,
	bump: BumpType,
	title: string,
	body: string,
): Promise<string> {
	await fs.mkdir(changenotesDir, { recursive: true });

	const content = stringifyChangenote({
		frontmatter: { bump },
		title,
		body,
	});
	const filePath = join(changenotesDir, `${id}.md`);
	await fs.writeFile(filePath, content, "utf-8");

	return filePath;
}

const PREPARE_FILE = "prepare.json";

/** Write a prepare config to the .changenotes directory */
export async function writePrepareConfig(
	changenotesDir: string,
	config: PrepareConfig,
): Promise<string> {
	await fs.mkdir(changenotesDir, { recursive: true });
	const filePath = join(changenotesDir, PREPARE_FILE);
	await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
	return filePath;
}

/** Read the prepare config from the .changenotes directory, or null if not present */
export async function readPrepareConfig(
	changenotesDir: string,
): Promise<PrepareConfig | null> {
	const filePath = join(changenotesDir, PREPARE_FILE);
	try {
		const content = await fs.readFile(filePath, "utf-8");
		return JSON.parse(content) as PrepareConfig;
	} catch {
		return null;
	}
}

/** Remove the prepare config file after it has been consumed */
export async function consumePrepareConfig(
	changenotesDir: string,
): Promise<void> {
	const filePath = join(changenotesDir, PREPARE_FILE);
	try {
		await fs.unlink(filePath);
	} catch {
		// ignore if already removed
	}
}

/** Load the Unorepo config */
export async function loadConfig(dir: string): Promise<UnorepoConfig> {
	const configPath = join(dir, CONFIG_FILE_NAME);

	const module = await import(configPath);
	const config = module.default as UnorepoConfig | undefined;
	if (!config || typeof config !== "object") {
		throw new Error();
	}
	return config;
}
