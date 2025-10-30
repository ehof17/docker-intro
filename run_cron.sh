#!/bin/bash
set -euo pipefail

# Always run from /app so relative paths work
cd /app

# Make sure local bin tools are first on PATH
export PATH="/app/node_modules/.bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

SITES=("leconnections" "hoopgrids" "leconnectionshof")

for SITE in "${SITES[@]}"; do
  echo "=============================="
  echo "Processing site: $SITE"
  echo "=============================="

  # Prefer tsx (already in devDependencies). No npx.
  if [[ "$SITE" == "leconnectionshof" ]]; then
    OUTPUT=$(tsx run_bounds.ts "$SITE" 100000)
  else
    OUTPUT=$(tsx run_bounds.ts "$SITE")
  fi

  echo "Missing IDs for $SITE: $OUTPUT"

  if [[ "$OUTPUT" == "[]" || -z "$OUTPUT" ]]; then
    echo "No missing IDs for $SITE — skipping."
    continue
  fi

  # jq is required
  mapfile -t IDS < <(echo "$OUTPUT" | jq -r '.[]')
  for ID in "${IDS[@]}"; do
    echo "Fetching Looker for $SITE (game ID $ID)"
    tsx cli.ts --name "$SITE" --id "$ID"
  done

  echo "Finished processing $SITE"
  echo
done
