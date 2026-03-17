#!/usr/bin/env node
import { Command } from "commander";
import { changeCommand } from "./commands/change";
import { commitCommand } from "./commands/commit";
import { initCommand } from "./commands/init";
import { prepareCommand } from "./commands/prepare";
import { tagCommand } from "./commands/tag";
import { versionCommand } from "./commands/version";

const program = new Command();

program
	.name("unorepo-alpha")
	.description("An automated javascript package release manager")
	.version("0.0.1");

program
	.command("init")
	.description("Initialize unorepo for the cwd package")
	.action(initCommand);

program
	.command("change")
	.description("Add a new changenote")
	.action(changeCommand);

program
	.command("commit")
	.description("Commit staged changenote using its title as the commit message")
	.action(commitCommand);

program
	.command("prepare")
	.description("Write a prepare config for the next release")
	.argument("<type>", "Release type: release or prerelease")
	.argument("[tag]", "Prerelease tag (e.g. alpha, beta). Defaults to alpha")
	.option("--commit", "Commit the prepare config after writing it")
	.option("--push", "Push to origin after committing (implies --commit)")
	.action((type, tag, options) => prepareCommand(type, tag, options));

program
	.command("version")
	.description("Apply changenotes and bump version")
	.option(
		"--commit",
		"Create a git commit with a release message after bumping versions",
	)
	.option("--tag", "Create a git tag after bumping versions (implies --commit)")
	.option(
		"--push",
		"Push commit and tag to origin after tagging (implies --tag, --commit)",
	)
	.option("--publish", "Run publisher plugins after pushing (implies --push)")
	.option("--release", "Run releaser plugins after pushing (implies --push)")
	.action(versionCommand);

program
	.command("tag")
	.description(
		"Tag changenote with PR number and author (reads BASE_REF, PR_NUMBER, PR_LOGIN from env)",
	)
	.action(tagCommand);

program.parse();
