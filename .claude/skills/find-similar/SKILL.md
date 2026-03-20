---
name: find-similar
description: |
  Find Similar Prototypes

  Search through shared prototypes and branches to find prior art related to what the user wants to build.

  Trigger scenarios:
  - User asks "has anyone built X before?"
  - User wants to know if something similar already exists
  - User describes what they want to build and wants to find prior art
---

# Find Similar Prototypes

Search through shared prototypes and branches to find prior art related to what the user wants to build.

## Steps

### 1. Fetch the share index

Download the share index to search through existing shared prototypes:

```bash
curl -s "https://protov2.figma.design/share/index.json" > /tmp/share-index.json
```

If the index is unavailable, note that and proceed to step 3.

### 2. Search the index

Parse the index and search for relevant entries. Match the user's description against these fields:
- `description` — what the prototype does
- `tags` — tags like `#sharing`, `#gallery`, `#dashboard`
- `base.branch` — branch name (often descriptive, e.g. `alice/sharing-center`)
- `author` — who built it

Use `jq` to filter. Example:

```bash
# Search for entries matching keywords
jq '[.[] | select(
  (.description | ascii_downcase | test("KEYWORD1|KEYWORD2")) or
  (.base.branch | ascii_downcase | test("KEYWORD1|KEYWORD2")) or
  (.tags | map(ascii_downcase) | any(test("KEYWORD1|KEYWORD2")))
)]' /tmp/share-index.json
```

Replace `KEYWORD1|KEYWORD2` with relevant search terms derived from the user's description. Think of synonyms and related terms (e.g., for "gallery" also search "catalog", "browse", "list", "grid").

### 3. Search git branches

Search remote branch names for relevant keywords:

```bash
git fetch --prune origin
git branch -r | grep -iE "KEYWORD1|KEYWORD2|KEYWORD3"
```

This catches work that was never shared but may still be relevant.

### 4. Present results

Format findings as a ranked list. For each match, show:

- **Branch**: the branch name
- **URL**: `https://protov2.figma.design/share/{branch}/latest/`
- **Description**: what the prototype does
- **Tags**: tags
- **Author**: who built it
- **Date**: when it was last shared
- **Relevance**: brief note on why this matches

Group results:
1. **Strong matches** — description or tags directly mention the concept
2. **Possible matches** — branch name suggests relevance
3. **Branch-only** — found in git branches but not in the share index (may not be deployed)

If no results found, say so clearly and suggest the user proceed with building.
