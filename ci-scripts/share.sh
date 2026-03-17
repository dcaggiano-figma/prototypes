#!/usr/bin/env bash
set -euo pipefail

# Usage: ./ci-scripts/share.sh --branch <name> --sha <short-sha> --dist <path> [--pin <name>] [--test-deploy]
#
# Uploads a built prototype to S3. Every deploy goes to both:
#   <prefix>/<branch>/<sha>/          <- immutable snapshot
#   <prefix>/<branch>/latest/         <- latest (overwritten every deploy)
#
# Optionally creates an additional pinned snapshot when --pin is passed.
#
# --test-deploy: use dev-share/ prefix instead of share/, add 7-day expiry.

S3_BUCKET="s3://figma-protov2"
BASE_URL="https://protov2.figma.design"

BRANCH=""
SHA=""
DIST=""
PIN=""
TEST_DEPLOY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)      BRANCH="$2";      shift 2 ;;
    --sha)         SHA="$2";         shift 2 ;;
    --dist)        DIST="$2";        shift 2 ;;
    --pin)         PIN="$2";         shift 2 ;;
    --test-deploy) TEST_DEPLOY=true; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$SHA" ]]; then
  echo "Error: --sha is required" >&2
  exit 1
fi

# --test-deploy -> dev-share/ prefix + 7-day expiry; otherwise share/
if [[ "$TEST_DEPLOY" == true ]]; then
  PREFIX="dev-share"
  EXPIRES=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -u -v+7d +"%Y-%m-%dT%H:%M:%SZ")
  EXTRA_SYNC="--delete --expires $EXPIRES"
else
  PREFIX="share"
  EXTRA_SYNC=""
fi

# -- Upload SHA snapshot (<prefix>/<branch>/<sha>/) ----------------------------

SHA_DEST="$S3_BUCKET/$PREFIX/$BRANCH/$SHA/"
echo "Syncing to $SHA_DEST ..."
aws s3 sync "$DIST/" "$SHA_DEST" $EXTRA_SYNC

SHA_URL="$BASE_URL/$PREFIX/$BRANCH/$SHA/"
echo ""
echo "SHA snapshot: $SHA_URL"

# -- Upload latest (<prefix>/<branch>/latest/) --------------------------------

LATEST_DEST="$S3_BUCKET/$PREFIX/$BRANCH/latest/"
echo "Syncing to $LATEST_DEST ..."
aws s3 sync "$DIST/" "$LATEST_DEST" $EXTRA_SYNC

LATEST_URL="$BASE_URL/$PREFIX/$BRANCH/latest/"
echo ""
echo "Latest: $LATEST_URL"

# -- Pin snapshot (<prefix>/<branch>/<pin>/) -----------------------------------

if [[ -n "$PIN" ]]; then
  PIN_DEST="$S3_BUCKET/$PREFIX/$BRANCH/$PIN/"
  echo ""
  echo "Pinning to $PIN_DEST ..."
  aws s3 sync "$DIST/" "$PIN_DEST" $EXTRA_SYNC

  PIN_URL="$BASE_URL/$PREFIX/$BRANCH/$PIN/"
  echo ""
  echo "Pinned at: $PIN_URL"
fi
