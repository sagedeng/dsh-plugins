#!/usr/bin/env bash
# 把每个插件打成可离线分发的 tgz，落到 dist/。
#   ./scripts/pack.sh
# 产物名形如 dist/local-dsh-cost-lens-0.1.0.tgz（pnpm 会把 @scope/ 规范化成 scope-）。
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/dist"
node --input-type=module -e '
  import { readFile } from "node:fs/promises"
  const manifest = JSON.parse(await readFile(process.argv[1] + "/plugins.json", "utf8"))
  for (const p of manifest.plugins) console.log(p.dir + "\t" + p.version)
' "$root" | while IFS=$'\t' read -r dir version; do
  echo "packing $dir@$version"
  ( cd "$root/$dir" && pnpm pack --pack-destination "$root/dist" >/dev/null )
done
echo
ls -lh "$root/dist"/*.tgz
