<!-- references/surfaces.md — GENERATED from the normative layer of
     umbralmx/umbral-style-guide v1.3.0. Do not edit; regenerate. -->

# Surfaces

| Surface | Mode | The thing that bites |
|---|---|---|
| Web | laboratorio | Self-host fonts; never a CDN |
| Streamlit | instrumento | `primaryColor` hits every widget; `lang="en"` is hardcoded |
| Quarto | laboratorio | Use the generated `_brand.yml`; `fig-alt` carries the finding |
| Notebook | laboratorio | Use the generated `.mplstyle`; the v1.0 one failed contrast |
| Social | instrumento | The card travels without its page — the source line is mandatory |
| Slides | laboratorio | Nothing below 24px, ever |
| GitHub | — | No emoji, no decorative badges, both licence files |
| Email | laboratorio | No CSS variables; inline values copied from the build |

## Streamlit — the two traps

**1. The config keys.** v1.0's brand book rendered them as `sc-camel-primary-color`, a PDF-export
artifact. It also set `font = "sans serif"`, which is a *valid* Streamlit value meaning Streamlit's
own Source Sans. Copy the generated file instead:

```bash
cp assets/streamlit-config.toml .streamlit/config.toml
```

**2. `lang="en"`.** Streamlit hardcodes it. One call, at the top of the app:

```python
import streamlit.components.v1 as components
components.html("<script>window.parent.document.documentElement.lang='es';</script>", height=0)
```

**On `signal` in Streamlit:** `primaryColor` is applied to sliders, chips, tabs, links and focus
rings simultaneously. No configuration restricts it to one element. So UMB-COL-004 is scoped to the
data layer — in a dashboard it means *one series in signal per chart*. Widget chrome is exempt.

## Rule counts by surface

| Surface | Rules |
|---|---|
| `web` | 71 |
| `quarto` | 70 |
| `streamlit` | 68 |
| `slides` | 61 |
| `notebook` | 59 |
| `social` | 56 |
| `print` | 52 |
| `email` | 29 |
| `github` | 20 |
| `repo` | 14 |
