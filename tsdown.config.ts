import { defineConfig } from "tsdown";

export default defineConfig({
	tsconfig: "tsconfig.json",
	entry: ["src/index.ts", "src/publishers/npm.ts", "src/releasers/github.ts"],
	outDir: "dist/src",
	format: "esm",
	unbundle: true,
	dts: true,
	clean: true,
});
