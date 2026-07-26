# Umbral brand — superseded

These docs used to hold a copy of the v1.0 brand book and engineering handoff. Both are
now **superseded by the style guide**, which is the single normative source:

**https://umbralmx.github.io/umbral-style-guide**

The copies were removed rather than updated, because keeping a second copy is the exact
failure the style guide exists to prevent. The July 2026 audit found that the two v1.0
documents had drifted apart — they disagreed about the third series colour, and the
version that failed contrast is the one that won in the Python tooling. A local copy
here would drift the same way.

## What this repo uses instead

| | |
|---|---|
| `assets/tokens.json` | Vendored from `umbral-style-guide` v1.1.0. The only place a colour lives. |
| `.streamlit/config.toml` | Generated theme config. |
| `dashboard/theme.py` | Reads the tokens; nothing here retypes a hex or a font family. |

To update, pull the new `tokens.json` from the pinned tag:

```bash
curl -O https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/tokens/build/tokens.json
```

## The agent instructions

The minimum an AI needs is in `CLAUDE.md`, generated from
`umbral-style-guide/dist/CLAUDE.snippet.md`. For the full system, install the skill:

```bash
mkdir -p .claude/skills
curl -L https://github.com/umbralmx/umbral-style-guide/releases/download/v1.1.0/umbral-brand-v1.1.0.skill -o /tmp/umbral.skill
unzip -q /tmp/umbral.skill -d .claude/skills/umbral-brand
```
