#!/usr/bin/env node
import { Command } from "commander";
import { changeCommand } from "./commands/change";
import { commitCommand } from "./commands/commit";
import { initCommand } from "./commands/init";
import { prepareCommand } from "./commands/prepare";
import { reprepareCommand } from "./commands/reprepare";
import { versionCommand } from "./commands/version";

const program = new Command();

program
	.name("unorepo-alpha")
	.description("A highly configurable package release manager")
	// biome-ignore lint/style/noNonNullAssertion: <>
	.version(process.env.VERSION!);

program
	.command("init")
	.description("Initialize unorepo for the cwd package")
	.action(initCommand);

program
	.command("change")
	.alias("cng")
	.description("Add a new changenote")
	.argument("[bump]", "Bump type: patch, minor, or major")
	.argument("[title]", "Title of the change")
	.action((bump, title) => changeCommand(bump, title));

program
	.command("commit")
	.description("Commit staged changenote using its title as the commit message")
	.option("--push", "Push to origin after committing")
	.action(commitCommand);

program
	.command("prepare")
	.alias("prep")
	.description("Write a prepare config for the next release")
	.argument(
		"<type>",
		"Release type: release|prepatch|preminor|premajor|prerelease",
	)
	.argument("[tag]", "Pre tag (e.g. alpha, beta). Defaults to alpha")
	.option("--commit", "Commit the prepare config after writing it")
	.option("--push", "Push to origin after committing (implies --commit)")
	.action((type, tag, options) => prepareCommand(type, tag, options));

program
	.command("version")
	.alias("vrsn")
	.description("Apply changenotes and bump version")
	.option(
		"--commit",
		"Create a git commit with a release message after bumping versions",
	)
	.option("--tag", "Create a git tag after bumping versions (implies --commit)")
	.option(
		"--push",
		"Push commit and tag to origin after tagging (implies --commit,--tag)",
	)
	.option("--publish", "Run publisher plugins after pushing (implies --push)")
	.option("--release", "Run releaser plugins after pushing (implies --push)")
	.action(versionCommand);

program
	.command("reprepare")
	.alias("reprep")
	.description(
		"Increment the try counter in prepare.json and optionally commit/push (for CI retries)",
	)
	.option("--commit", "Commit the updated prepare config")
	.option("--push", "Push to origin after committing (implies --commit)")
	.action((options) => reprepareCommand(options));

program.parse();
