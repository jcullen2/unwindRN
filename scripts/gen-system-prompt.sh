#!/bin/sh
# Regenerates supabase/functions/debrief-turn/system-prompt.ts from
# system-prompt.md. The .md is the editable source (CLAUDE.md law); the .ts
# exists because eszip deploys bundle only the import graph and drop static
# assets, so the function must import the prompt rather than read it at runtime.
# Run after every edit to system-prompt.md, before deploying debrief-turn.
set -e
cd "$(dirname "$0")/../supabase/functions/debrief-turn"
node -e '
const fs = require("fs");
const md = fs.readFileSync("system-prompt.md", "utf8");
fs.writeFileSync(
  "system-prompt.ts",
  "// AUTO-GENERATED from system-prompt.md by scripts/gen-system-prompt.sh — do not edit.\n" +
    "export const SYSTEM_PROMPT_TEMPLATE = " + JSON.stringify(md) + ";\n",
);
'
echo "system-prompt.ts regenerated"
