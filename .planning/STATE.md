# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Consistently produce 1 on-brand, industry-relevant video per day with only storyboard approval as the manual step.
**Current focus:** Phase 4: Storyboard Approval

## Current Position

Phase: 4 of 5 (Storyboard Approval)
Plan: 1 of 2 in phase 4 (just completed)
Status: Storyboard generation API operational with OpenAI GPT-4o integration
Last activity: 2026-02-11 — Created StoryboardGenerator service with LLM integration and REST endpoints

Progress: [███████░░░] 71% (10/14 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Total execution time: ~5 hours 24 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-schema | 3/3 | ~3 hrs | ~60 min |
| 02-remotion-render-api | 3/3 | ~87 min | ~29 min |
| 03-asset-generation | 3/3 | ~48 min | ~16 min |
| 04-storyboard-approval | 1/2 | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 03-01, 03-02, 03-03, 04-01
- Phase 3 complete (Asset generation pipeline with n8n integration E2E verified)
- Phase 4 in progress (Storyboard generation API operational)

*Updated after each plan completion*
| Phase 03 P01 | 139s | 2 tasks | 3 files |
| Phase 03 P02 | 149s | 2 tasks | 4 files |
| Phase 03 P03 | 43min | 2 tasks | 5 files |
| Phase 04 P01 | 141s | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Google Sheets as state + approval layer — provides easy visual review, no custom UI needed
- n8n for orchestration — existing production experience, native Google Sheets integration
- Scene-level approval (not whole-video) — gives granular control before costly asset generation
- Manual edit on rejection (not AI retry) — user knows best what they want
- 4 separate n8n workflows — clean separation of concerns (Research → Storyboard → Asset Gen → Render)
- npm install over npm ci in Docker — package-lock.json too large for GitHub MCP, npm install generates lock during build
- Webpack extensionAlias for NodeNext imports — Remotion bundler needs explicit .js → .ts/.tsx mapping
- Inline Docker command pattern for Hostinger — managed Docker doesn't support build context syntax
- n8n Wait node with 30-second polling interval for job completion instead of custom polling logic
- Update asset_status to IN_PROGRESS before generation to prevent duplicate processing
- Persistent assets volume in Docker for downloaded asset files
- Native fetch for OpenAI API calls (no SDK) matching project pattern
- Duration enforcement with last-scene adjustment or proportional redistribution
- Storyboard ID format: SB-{topicId} matching Google Sheets schema convention

**From plan 01-01:**
- 4-tab Google Sheets schema: Topics → Storyboards → Assets → Completed Videos
- Status columns use dropdown validation to prevent typos
- State machine status flows: New→Selected→Used (Topics), READY→IN_PROGRESS→DONE→FAILED (Assets/Videos)
- Scene-level granularity in Storyboards (one row per scene for granular approval)
- Text-based foreign keys for human readability (topic_id, storyboard_id, asset_id)
- Conditional formatting for visual status feedback (grey/yellow/green/red)
- Apps Script automation for one-click schema setup

**From plan 01-02:**
- Express + Pino + Zod render server scaffold deployed to VPS
- Health endpoint: GET /health returns status, uptime, timestamp
- Stub render endpoint: POST /render validates scene JSON, returns 202
- Scene JSON contract defined with TypeScript types + Zod runtime validation
- Deployed via Hostinger MCP as Docker project "katbox-render"
- Build-on-first-run pattern with cached volume (render_app)
- Caddy reverse proxy: render.digitalcallum.com → katbox-render:3000
- TLS auto-provisioned via Let's Encrypt

**From plan 01-03:**
- Async polling utility (pollUntilDone) with exponential backoff 10s→60s
- Logger dependency injection via PollerLogger interface
- n8n error workflow template (importable JSON)
- Infrastructure patterns documented (polling, state transitions, error handling, logging)

**From plan 02-01:**
- Remotion project scaffold: index.ts with registerRoot, Root.tsx with KatboxVideo composition
- 1080x1920 (9:16 vertical) composition at 30fps with dynamic duration from scene array
- Scene routing: VideoScene (OffthreadVideo), PhotoScene (Img + Ken Burns), MotionGraphicsScene (branded text)
- TextOverlay component with brand colors and bottom positioning
- Watermark component (top-right, 70% opacity) as persistent overlay
- SceneAudio component for synced voiceover playback
- Remotion 4.0.421 + React 19.2.4 installed
- Fixed zod@3.22.3 (exact version required by Remotion)
- ESM imports with explicit .js extensions (NodeNext module resolution)

**From plan 02-02:**
- JobManager service: in-memory job tracking with UUID-based job IDs, status lifecycle (queued→bundling→rendering→completed/failed)
- RenderService: bundle-once pattern with ensureBundle(), renderMedia orchestration, progress tracking via onProgress callbacks
- POST /render creates async job and returns 202 with jobId immediately
- GET /render/:jobId returns job status with progress percentage (0-100)
- Static file serving at /output/ for rendered MP4 downloads
- Remotion bundle pre-warmed at server startup (non-blocking)
- Periodic job cleanup every 1 hour (removes jobs older than 24 hours)
- Download URLs generated as ${RENDER_BASE_URL}/output/${jobId}.mp4

**From plan 02-03:**
- Production Dockerfile: node:22-bookworm-slim with Chrome Headless Shell system dependencies (14 shared libs)
- Remotion browser ensure downloads Chrome binary for headless rendering
- Multi-stage Docker build: builder compiles TypeScript, production runs server with source TSX files
- Webpack extensionAlias override in RenderService fixes NodeNext .js → .ts/.tsx resolution
- npm install instead of npm ci (package-lock.json too large for GitHub MCP)
- E2E verified on VPS: POST /render → async job → MP4 download in ~24 seconds for 2-scene video
- 1080x1920 (9:16) at 30fps with watermark, text overlays, brand colors, audio sync
- RENDER_BASE_URL env var for download URL generation (https://render.digitalcallum.com)

**From plan 03-01:**
- Kie AI unified API for all three asset types (video, photo, voiceover)
- Download assets immediately to VPS storage to survive 24-hour URL expiry
- KieAiClient class with generateVideo, generatePhoto, generateVoiceover methods
- Asset downloader with downloadAsset, getAssetUrl, downloadSceneAssets functions
- Native fetch API used (no axios dependency)
- Integrated with existing pollUntilDone for async task polling

**From plan 03-02:**
- AssetGenerator service: job-based orchestrator with UUID job IDs, status lifecycle (queued→generating→completed/failed)
- Sequential scene processing to avoid overwhelming Kie AI rate limits
- Parallel visual + voiceover generation within each scene for efficiency
- Per-scene status tracking: independent visual and voiceover status per scene
- Scene type routing: ai-video → Kling 2.6, ai-photo → Flux 2 Pro, motion-graphics → local config, all → ElevenLabs voiceover
- Motion graphics scenes create config objects locally (no API call needed)
- POST /assets/generate accepts storyboard scenes, validates with Zod, returns 202 with jobId
- GET /assets/generate/:jobId returns per-scene generation status and asset URLs
- Static file serving at /assets/ for downloaded asset files
- API routes mounted at /assets/generate to avoid path conflicts with static file serving
- Periodic cleanup for asset generation jobs (24-hour retention)
- Fire-and-forget async pattern matching render pipeline

**From plan 03-03:**
- n8n workflow template for automated asset generation pipeline (importable JSON)
- Workflow orchestrates: read approved scenes → trigger generation → poll for completion → write asset URLs to Sheets
- Google Sheets integration: reads Storyboards tab (status=Approved, asset_status=READY), writes to Assets tab
- n8n Wait node polling pattern with 30-second intervals for job completion
- Dual trigger options: Manual Trigger for testing, Webhook Trigger for automation
- Error workflow template for centralized error handling
- Persistent Docker volume for assets ensures files survive container restarts
- KIE_AI_API_KEY environment variable added to Docker deployment
- E2E verified: 2 test scenes generated AI photo + voiceover in 43 seconds

**From plan 04-01:**
- StoryboardGenerator service with OpenAI GPT-4o integration for structured storyboard generation
- Native fetch for OpenAI API calls (no SDK dependency) matching project pattern
- POST /storyboard/generate endpoint accepts topicId, topicTitle, topicSummary, contentPillar
- GET /storyboard/generate/:jobId endpoint returns job status with generated scenes array
- 60-second duration enforcement with auto-correction: last-scene adjustment or proportional redistribution
- Storyboard scene structure: 7 fields (scene_number, duration_seconds, visual_description, visual_type, narration_text, onscreen_text, ai_prompt)
- Visual type routing: ai-video (Kling), ai-photo (Flux), motion-graphics (local config)
- Taglish narration text for Filipino audience (Tagalog-English mix)
- Async job pattern matching AssetGenerator (fire-and-forget processJob, status polling)
- Storyboard ID format: SB-{topicId} matching Google Sheets schema
- Periodic cleanup for storyboard generation jobs (24-hour retention)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-11T05:10:08Z
Stopped at: Completed 04-01-PLAN.md — Storyboard generation API operational with OpenAI GPT-4o integration
Resume file: None
Next: Continue Phase 4 — Plan 04-02 (n8n storyboard workflow)
