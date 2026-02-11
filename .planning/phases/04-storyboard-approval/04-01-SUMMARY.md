---
phase: 04-storyboard-approval
plan: 01
subsystem: api
tags: [openai, gpt-4o, llm, storyboard, zod, express]

# Dependency graph
requires:
  - phase: 03-asset-generation
    provides: Async job pattern with status polling and periodic cleanup
provides:
  - StoryboardGenerator service with OpenAI GPT-4o integration for structured storyboard generation
  - POST /storyboard/generate endpoint with Zod validation
  - GET /storyboard/generate/:jobId endpoint for job status polling
  - 60-second duration enforcement with auto-correction
  - Taglish narration and visual type routing
affects: [04-02, 05-render-pipeline]

# Tech tracking
tech-stack:
  added: [OpenAI GPT-4o API integration via native fetch]
  patterns: [LLM-based content generation with structured JSON output, duration enforcement with proportional redistribution]

key-files:
  created:
    - server/src/services/storyboard-generator.ts
    - server/src/routes/storyboard.ts
  modified:
    - server/src/index.ts

key-decisions:
  - "Native fetch for OpenAI API calls (no SDK) matching project pattern"
  - "Duration enforcement with last-scene adjustment or proportional redistribution"
  - "Storyboard ID format: SB-{topicId} matching Google Sheets schema convention"
  - "Async job pattern matching AssetGenerator for consistency"

patterns-established:
  - "LLM integration pattern: native fetch with structured JSON output via response_format"
  - "Post-LLM validation: enforce business rules (60s duration) after generation"
  - "Proportional redistribution: when adjustment would violate scene duration constraints (3-15s)"

# Metrics
duration: 2min 21s
completed: 2026-02-11
---

# Phase 04 Plan 01: Storyboard Generation Service Summary

**OpenAI GPT-4o integration generates structured 60-second storyboards with Taglish narration, auto-correcting duration and enforcing all 7 scene fields via async job API**

## Performance

- **Duration:** 2 min 21 sec
- **Started:** 2026-02-11T05:07:47Z
- **Completed:** 2026-02-11T05:10:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- StoryboardGenerator service with native fetch integration to OpenAI GPT-4o API
- Structured JSON output with 7 required scene fields (scene_number, duration_seconds, visual_description, visual_type, narration_text, onscreen_text, ai_prompt)
- 60-second duration enforcement with intelligent auto-correction (last-scene adjustment or proportional redistribution)
- POST /storyboard/generate and GET /storyboard/generate/:jobId REST endpoints with Zod validation
- Async job pattern matching existing AssetGenerator for consistency
- Periodic cleanup for old storyboard jobs (24-hour retention)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StoryboardGenerator service with LLM integration** - `5f7e3d9` (feat)
2. **Task 2: Create storyboard REST endpoints and wire into server** - `3b4c942` (feat)

## Files Created/Modified

- `server/src/services/storyboard-generator.ts` - StoryboardGenerator class with OpenAI integration, duration enforcement, and async job orchestration
- `server/src/routes/storyboard.ts` - POST / and GET /:jobId endpoints with Zod validation
- `server/src/index.ts` - Mounted storyboard routes at /storyboard/generate and added periodic cleanup

## Decisions Made

**1. Native fetch for OpenAI API calls (no SDK)**
- Matches existing project pattern of avoiding external SDKs (no axios, no openai SDK)
- Reduces dependencies and bundle size
- Direct control over API request/response handling

**2. Duration enforcement strategy**
- First attempt: adjust last scene if result stays within 3-15s range
- Fallback: proportional redistribution across all scenes if adjustment would violate constraints
- Ensures exact 60-second total while respecting per-scene limits

**3. Storyboard ID format: SB-{topicId}**
- Matches Google Sheets schema convention from plan 01-01
- Human-readable foreign key for tracking storyboards to topics

**4. Async job pattern matching AssetGenerator**
- Fire-and-forget processJob() async call
- Status polling via getJob(jobId)
- Consistent API patterns across all generation services

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed existing patterns and compiled without errors.

## User Setup Required

**External service requires manual configuration.**

Before storyboard generation will work:

1. **OpenAI API Key**
   - Get key from: https://platform.openai.com/api-keys
   - Add to environment: `OPENAI_API_KEY=sk-...`
   - Used for: GPT-4o structured storyboard generation

2. **Verification**
   ```bash
   curl -X POST http://localhost:3000/storyboard/generate \
     -H "Content-Type: application/json" \
     -d '{
       "topicId": "TEST-001",
       "topicTitle": "How to Pack Meal Boxes Faster",
       "topicSummary": "Tips for efficient meal box packing",
       "contentPillar": "Operations"
     }'
   ```
   Should return 202 with jobId. Poll with:
   ```bash
   curl http://localhost:3000/storyboard/generate/{jobId}
   ```

## Next Phase Readiness

- Storyboard generation API ready for n8n integration (plan 04-02)
- Generated storyboards will have exact 60-second duration for downstream asset generation
- All scene fields present for Google Sheets export
- Taglish narration ready for Filipino audience
- Ready to build n8n workflow to write storyboards to Google Sheets for approval

## Self-Check

Verifying claims before state updates:

**Files exist:**
- ✓ server/src/services/storyboard-generator.ts
- ✓ server/src/routes/storyboard.ts
- ✓ server/src/index.ts (modified)

**Commits exist:**
- ✓ 5f7e3d9: Task 1 commit (StoryboardGenerator service)
- ✓ 3b4c942: Task 2 commit (REST endpoints and wiring)

**Key functionality:**
- ✓ Native fetch to api.openai.com
- ✓ Duration enforcement (enforceDuration method)
- ✓ All 7 scene fields in StoryboardScene interface
- ✓ Async job pattern (startGeneration, getJob, processJob)
- ✓ Zod validation in routes
- ✓ TypeScript compiles without errors

## Self-Check: PASSED

All files exist, all commits present, all functionality verified.

---
*Phase: 04-storyboard-approval*
*Completed: 2026-02-11*
