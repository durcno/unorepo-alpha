#!/usr/bin/env bash

# Pre-tool hook: runs `pnpm run build` before the runTests tool is invoked.
# Receives a JSON payload on stdin describing the tool about to be called.

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

if [[ "$TOOL_NAME" != "runTests" ]]; then
	exit 0
fi

echo "[pre-test-build] Building project before running tests..." >&2

if ! npm run build >&2; then
	printf '%s\n' '{"continue": false, "stopReason": "npm run build failed — fix build errors before running tests."}'
	exit 2
fi

echo "[pre-test-build] Build succeeded." >&2
exit 0
