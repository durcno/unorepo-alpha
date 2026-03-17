import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "index.ts",
	outputOptions: {
		file: "../../dist/bin.mjs",
	},
	format: "esm",
	platform: "node",
	dts: false,
	clean: false,
	deps: {
		neverBundle: ["unorepo-alpha"],
	},
});
