# Installation and startup

Commands below run from `assets/app` inside the installed skill. Use an absolute app path when the current working directory is elsewhere. Tested platform: macOS Apple Silicon; `server/media.mjs` currently depends on the Darwin ARM64 Remotion compositor. Other operating systems are not supported by this release.

Requirements: Node.js >=22.12, Python >=3.10, and Google Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (or set PAPER_CHROME to its executable).

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Start in a persistent terminal:

```sh
PAPER_PYTHON="$PWD/.venv/bin/python" npm run dev
```

Open http://127.0.0.1:4317/#templates . Fresh startup creates an empty local workspace. To choose another port, set `PORT=4327` when starting and `PAPER_MOTION_URL=http://127.0.0.1:4327` for CLI commands. The app binds only to loopback; no cloud hosting is required. Do not expose this local file-import API publicly.

Optional `.env` values: PAPER_PYTHON (absolute Python executable), PAPER_CHROME (absolute Chrome executable), PORT. Do not copy a different user's `.env` or commit it. Paths containing spaces must be quoted in shell commands.

Verification:

```sh
npm run check
npm test
npm run build
PAPER_PYTHON="$PWD/.venv/bin/python" npm run test:pdf
node scripts/agent.mjs templates
```

For a first smoke test, create a timeline with `{ "template": "timeline-v1", "name": "我的时间线", "actor": "agent" }`; it uses clearly illustrative milestones and requires no PDF/video. Open the returned instance and export MP4 to validate Chrome rendering.

PDFs require a text layer; OCR is not included. Video inputs are 0.5–60 seconds / 500MB each, center-cropped to 16:9 and cached as JPEG frames plus WAV audio. Allow local disk space for these caches. Generated clips can be imported into Final Cut or Premiere. This is an effects toolkit, not a complete video editor.
