# `skills/umbral-brand/`

The Umbral brand system, packaged as an agent skill.

| | | |
|---|---|---|
| `SKILL.md` | authored | Instructions, the decision procedure, the ten most-broken rules |
| `references/` | **generated** | Loaded on demand: color, charts, voice-and-numbers, surfaces, terminology, checklist |
| `scripts/` | authored | Deterministic work — run these rather than reasoning about numbers |
| `assets/` | **generated** | Pinned copies of the tokens, rules, themes and logos |

## The scripts

```bash
python3 scripts/check_contrast.py "#128273" "#F2F3F1"   # ratio + pass/fail by role
python3 scripts/check_contrast.py --audit               # every token pair
python3 scripts/apply_theme.py --show matplotlib        # setup code to paste
python3 scripts/lint.py <path>                          # conformance checks
```

`lint.py` is a standalone subset of `tools/umbral-lint`. It parses declarations instead of matching
strings.

A naive grep for the banned strings is almost entirely false positives on real Umbral code. `Inter`
matches `cursor: pointer`. `white` matches `white-space`. An `inset` box-shadow is a 1px rule, not a
shadow.

## Progressive disclosure

`SKILL.md` stays under ~150 lines and points to `references/` for depth. An agent reads the body
first and pulls a reference in only when the task calls for it. Chart code needs
`references/charts.md`. Anything about disappearances needs `references/terminology.md`.

## Editing

Only `SKILL.md` and `scripts/` are hand-written. To change anything in `references/` or `assets/`,
change `tokens/src/`, `rules/rules.yaml` or `guide/`, then:

```bash
npm run build:skill
python3 tools/verify_skill.py
```
