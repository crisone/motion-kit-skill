---
name: motion-kit
description: Generate and fine-tune video effects with a local Remotion toolkit. Use for PDF highlights, focus, quotation cards, animated statistics, page-turn transitions, video magnifiers, or milestone timelines, with a web preview and MP4/ProRes export.
---

# Motion Kit

Turn the user's natural-language effect request into a saved instance, an optional web preview, and a rendered clip. The working app is bundled in `assets/app` relative to this skill. This version runs on **macOS Apple Silicon**, with Node >=22.12, Python >=3.10, and Google Chrome. Read [setup](references/setup.md) for first installation or startup failures. Do not assume a local service belongs to this installation: inspect `/api/health`, the launch process and port before using an existing server. Never stop an unrelated service to free a port.

## Workflow

1. From the app directory, use `node scripts/agent.mjs templates` and `template TEMPLATE_ID` to discover supported inputs and the JSON schema. Read [API details](references/api.md) for the relevant template's semantics and limits. The agent interprets natural language; the app itself has no LLM credentials or chat service.
2. Reuse the user's intended workspace (`workspaces`, then `instances WORKSPACE_ID`). Create a workspace only if needed. Input source files belong to the user; never invent file paths, PDF quotations, dates or numerical evidence.
3. Write request JSON to a file, then `node scripts/agent.mjs create REQUEST.json`. Prefer video-magnifier-v1 for a video crop; use the PDF variants only for PDF input. For ambiguous PDF matches, inspect candidates and provide an explicit matchIndex. Timeline dates are labels and nodes are equally spaced; do not imply a quantitative time or percentage axis.
4. Return `http://127.0.0.1:PORT/#instance/ID` for preview and optional manual adjustment. The web UI and export share the same Remotion scene. Use the active port, not a hardcoded default if changed.
5. Before modifying an existing instance, GET it again. Patch only requested settings, with its current revision and `actor: "agent"`. On 409, read intervening changes and retry only if still appropriate; on 423, preserve the user's lock. Never use actor=user to bypass a lock. Read `adjustments ID SINCE_REVISION` to understand manual tweaks; they are instance-specific evidence, not automatic permanent preferences.
6. For export, `render ID REQUEST.json` with `{revision,format:"mp4"}` or `"prores"`, then `job JOB_ID` until done or error. A render is an immutable revision and includes a JSON sidecar. Report failures instead of claiming completion. Return the output path or local download URL. Both formats currently have opaque backgrounds, 1920×1080 at 30 fps.

## Style customization

Timeline style is validated JSON in `settings.timelineStyle`, not arbitrary CSS or JavaScript. A patch such as `{timelineStyle:{accentColor:"#66b8e8",pastOpacity:0.45}}` merges with existing style fields, preserving other manual adjustments. `timelineEvents` replaces the entire event list. Read the schema before extending the style; unsupported effects require implementation work, not fictional API keys.

## Data

App-generated `data/`, `outputs/`, `.env`, frame caches and user media are local and ignored by Git. Do not upload them as part of sharing this skill. Workspaces organize instances; the legacy `/api/projects` routes and `data/projects` directory refer to instances, not workspace containers. Preserve revision checks and histories by editing through the API rather than writing canonical data files directly.
