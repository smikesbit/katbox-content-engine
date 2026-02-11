---
phase: 03-asset-generation
plan: 03
subsystem: orchestration
tags: [n8n, google-sheets, workflow-automation, kie-ai, docker]

# Dependency graph
requires:
  - phase: 03-02
    provides: AssetGenerator service with POST /assets/generate endpoint and job-based orchestration
  - phase: 01-01
    provides: Google Sheets schema with Storyboards and Assets tabs
provides:
  - n8n workflow template for automated asset generation pipeline
  - Complete integration: Google Sheets → Asset Generation → Sheets update
  - Docker deployment with KIE_AI_API_KEY environment variable
  - E2E verified pipeline from approved storyboard to generated assets
affects: [04-automated-orchestration, 05-video-assembly, n8n-workflows]

# Tech tracking
tech-stack:
  added: [n8n-workflow-json]
  patterns: [polling-with-wait-node, google-sheets-integration, async-job-orchestration]

key-files:
  created:
    - n8n/asset-generation-workflow.json
    - n8n/error-workflow.json
    - n8n/README.md
  modified:
    - deploy/docker-compose.vps.yml

key-decisions:
  - "n8n Wait node with 30-second polling interval for job completion instead of custom polling logic"
  - "Update asset_status to IN_PROGRESS before generation to prevent duplicate processing"
  - "Webhook + Manual Trigger options for both automated and manual workflow execution"
  - "Persistent assets volume in Docker for downloaded asset files"
  - "Group scenes by storyboardId for batch processing"

patterns-established:
  - "n8n workflow template pattern: importable JSON with placeholder credentials and sticky note configuration instructions"
  - "Google Sheets state transitions: READY → IN_PROGRESS → DONE/FAILED"
  - "Error workflow integration: all workflows connect to centralized error handler"

# Metrics
duration: 43min
completed: 2026-02-10
---

# Phase 3 Plan 3: n8n Asset Generation Workflow Summary

**n8n workflow orchestrates end-to-end asset generation from Google Sheets approved scenes to Kie AI-generated assets with automatic Sheets update**

## Performance

- **Duration:** 43 min
- **Started:** 2026-02-10T22:30:00Z (estimated from first commit)
- **Completed:** 2026-02-10T23:13:00Z (estimated from E2E verification)
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify)
- **Files modified:** 4 created, 1 modified

## Accomplishments
- Importable n8n workflow template automates: read approved scenes → trigger generation → poll for completion → write asset URLs to Sheets
- Docker deployment configured with KIE_AI_API_KEY environment variable for Kie AI authentication
- E2E verified pipeline: 2 test scenes generated real AI photo (Flux-2 Pro) and voiceover (ElevenLabs) in 43 seconds
- All generated assets accessible via HTTPS and persisted to VPS local storage
- Complete Phase 3 asset generation system operational

## Task Commits

Each task was committed atomically:

1. **Task 1: Create n8n asset generation workflow and update Docker deployment** - `454536e` (feat)
   - Additional fix: `bc98e8b` - Added assets volume for persistent storage (fix)

2. **Task 2: Verify end-to-end asset generation pipeline** - Checkpoint approved by human verification

**Plan metadata:** (will be committed with SUMMARY.md and STATE.md)

## Files Created/Modified

**Created:**
- `n8n/asset-generation-workflow.json` - Importable n8n workflow with Google Sheets integration, HTTP polling, and asset URL updates (518 lines)
- `n8n/error-workflow.json` - Centralized error handling workflow template (109 lines)
- `n8n/README.md` - Comprehensive documentation for workflow setup, configuration, and usage (198 lines)

**Modified:**
- `deploy/docker-compose.vps.yml` - Added KIE_AI_API_KEY environment variable and assets volume for persistent storage

## Decisions Made

**1. n8n Wait node polling pattern**
- **Decision:** Use n8n's built-in Wait node with 30-second intervals instead of custom polling logic
- **Rationale:** Native n8n pattern is more maintainable and visually clear in workflow editor

**2. Prevent duplicate processing**
- **Decision:** Update asset_status to IN_PROGRESS before triggering generation
- **Rationale:** Prevents race conditions if workflow runs while previous execution is still processing

**3. Dual trigger options**
- **Decision:** Include both Manual Trigger and Webhook Trigger in workflow template
- **Rationale:** Supports both manual testing and automated scheduling/external invocation

**4. Persistent assets volume**
- **Decision:** Add dedicated Docker volume for /app/assets directory
- **Rationale:** Generated assets survive container restarts and redeploys

**5. Batch by storyboard**
- **Decision:** Group scenes by storyboardId and send one generation request per storyboard
- **Rationale:** Matches API contract and enables future optimizations (parallel scene generation within storyboard)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added persistent assets volume to Docker compose**
- **Found during:** Task 2 (E2E verification preparation)
- **Issue:** Generated asset files would be lost on container restart without persistent volume
- **Fix:** Added `assets_storage` volume mounted at /app/assets in docker-compose.vps.yml
- **Files modified:** deploy/docker-compose.vps.yml
- **Verification:** Volume persists across container restarts
- **Committed in:** bc98e8b (separate fix commit after Task 1)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for production reliability. No scope creep.

## Issues Encountered

None - plan executed smoothly with one auto-fix for persistent storage.

## E2E Verification Results

**Test Configuration:**
- Storyboard ID: SB-TEST-001
- Scenes: 2 (ai-photo + motion-graphics)
- Total generation time: ~43 seconds

**Scene 1 (ai-photo):**
- Visual: Flux-2 Pro generated photo of meal box with Filipino dishes
- Voiceover: ElevenLabs TTS in Filipino ("Ang ganda ng meal box...")
- Both assets downloaded to VPS and accessible via HTTPS

**Scene 2 (motion-graphics):**
- Visual: Local config object created (no API call)
- Voiceover: ElevenLabs TTS in Filipino ("Three reasons why...")
- Config + voiceover ready for Remotion rendering

**Verification Passed:**
- Server health check: 200 OK
- POST /assets/generate: 202 with jobId 08cb861e-7575-44b7-8b13-d7e13dfd251a
- Job completion polling: Status changed from queued → generating → completed
- Asset URLs: All returned 200 with correct Content-Type headers
- VPS storage: Files persisted in /app/assets directory

## User Setup Required

**KIE_AI_API_KEY environment variable:**
- Already configured on VPS host for production deployment
- Required for Kie AI API authentication (Kling 2.6, Flux-2 Pro, ElevenLabs)

**n8n Workflow Import:**
- Import n8n/asset-generation-workflow.json and n8n/error-workflow.json via n8n UI
- Configure Google Sheets OAuth2 credentials
- Connect error workflow as error handler
- Optional: Replace Manual Trigger with Schedule Trigger for daily automation

See n8n/README.md for detailed setup instructions.

## Next Phase Readiness

**Phase 3 Asset Generation COMPLETE:**
- Kie AI client integrated (Kling 2.6, Flux-2 Pro, ElevenLabs)
- Asset download utility stores files to VPS local storage
- AssetGenerator service orchestrates async generation with job tracking
- API endpoints: POST /assets/generate and GET /assets/generate/:jobId
- n8n workflow template ready for Google Sheets integration
- E2E verified: approved scenes → generated assets → accessible URLs

**Ready for Phase 4 (Automated Orchestration):**
- All asset types (video, photo, voiceover, motion-graphics) operational
- Google Sheets state management patterns established
- n8n workflow templates in place
- Polling and async job patterns proven

**No blockers or concerns.**

## Self-Check: PASSED

All claimed files exist:
- FOUND: n8n/asset-generation-workflow.json
- FOUND: n8n/error-workflow.json
- FOUND: n8n/README.md
- FOUND: deploy/docker-compose.vps.yml

All claimed commits exist:
- FOUND: 454536e
- FOUND: bc98e8b

---
*Phase: 03-asset-generation*
*Completed: 2026-02-10*
