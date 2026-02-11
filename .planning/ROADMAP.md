# Roadmap: Katbox Content Engine

## Overview

This roadmap builds an automated video pipeline that produces 1 daily 60-second vertical video from trending topics. We follow a REVERSE build order (based on architecture research): validate the rendering endpoint first, then build upstream workflows backward through asset generation, storyboarding, and research. This approach ensures the final output (9:16 video) works correctly before investing in complex AI generation and orchestration layers. Each phase delivers a testable, coherent capability using n8n orchestration and Google Sheets as the state management and approval interface.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Schema** - Google Sheets schema and infrastructure patterns for all workflows
- [x] **Phase 2: Remotion Render API** - Video rendering endpoint that accepts scene JSON and outputs 9:16 MP4
- [x] **Phase 3: Asset Generation** - AI video, photo, voiceover generation via Kie AI with async polling
- [ ] **Phase 4: Storyboard & Approval** - Scene-by-scene storyboard generation with human approval workflow
- [ ] **Phase 5: Research & Orchestration** - Trend discovery, topic rotation, and end-to-end pipeline integration

## Phase Details

### Phase 1: Foundation & Schema
**Goal**: Google Sheets schema and infrastructure patterns are established for all workflows to use
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02, INF-03, INF-04, INF-05, SHT-01, SHT-02, SHT-03, SHT-04
**Success Criteria** (what must be TRUE):
  1. Google Sheets has 4 tabs (Topics, Storyboards, Assets, Completed Videos) with complete column schema
  2. State transition columns (READY / IN_PROGRESS / DONE / FAILED) work across all sheets
  3. Remotion render server runs on VPS with Express/Fastify API endpoint accessible via HTTP
  4. Remotion server logs structured JSON via Pino for debugging
  5. n8n can connect to all Google Sheets tabs and Remotion API endpoint
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Google Sheets schema setup (4 tabs with columns, data validation, and documentation)
- [x] 01-02-PLAN.md — Remotion render server scaffold (Express + Pino + scene JSON types + placeholder endpoints)
- [x] 01-03-PLAN.md — Infrastructure patterns (async polling utility, n8n error workflow template, documentation)

### Phase 2: Remotion Render API
**Goal**: Remotion API endpoint accepts scene JSON and renders complete 9:16 MP4 with branding
**Depends on**: Phase 1
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, VID-06
**Success Criteria** (what must be TRUE):
  1. POST /render accepts scene array JSON (with video/photo URLs, narration audio, timing, text overlays)
  2. Remotion renders 9:16 (1080x1920) MP4 at 30fps with all scenes concatenated correctly
  3. Rendered video includes Katbox logo watermark throughout
  4. Rendered video uses Katbox brand colors and fonts for on-screen text
  5. Voiceover audio syncs perfectly to scene timing in final render
  6. Render completes and returns video download URL to be written to Completed Videos sheet
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Remotion project scaffold and scene compositions (entry point, root composition 9:16@30fps, scene components for video/photo/motion-graphics, text overlays, watermark, audio)
- [x] 02-02-PLAN.md — Render pipeline and async job management (replace stub /render with Remotion bundle+renderMedia, job queue, status polling endpoint, file serving)
- [x] 02-03-PLAN.md — Docker update and end-to-end verification (Remotion system deps, Chrome Headless Shell, VPS deployment, integration test)

### Phase 3: Asset Generation
**Goal**: AI assets (video, photo, voiceover) generate reliably via Kie AI with proper async handling
**Depends on**: Phase 2
**Requirements**: AST-01, AST-02, AST-03, AST-04, AST-05, AST-06
**Success Criteria** (what must be TRUE):
  1. Kie AI generates AI video (Sora 2 / Kling 2.5) for scenes marked ai-video
  2. Kie AI generates AI photos for scenes marked ai-photo
  3. Motion graphics config is created for scenes marked motion-graphics (rendered by Remotion)
  4. ElevenLabs generates Taglish voiceover narration via Kie AI for all scenes
  5. All asset URLs are saved back to the scene's row in Google Sheets Assets tab
  6. Generated video/photo assets are downloaded and stored on VPS to prevent URL expiry before rendering
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — Kie AI client, type definitions, and asset download utility (API integration foundation)
- [x] 03-02-PLAN.md — Asset generation orchestrator service and REST endpoints (per-scene generation with download to VPS)
- [x] 03-03-PLAN.md — n8n workflow template, Docker deployment update, and E2E verification

### Phase 4: Storyboard & Approval
**Goal**: AI generates scene-by-scene storyboards and human approval gates asset generation
**Depends on**: Phase 3
**Requirements**: STB-01, STB-02, STB-03, STB-04, APR-01, APR-02, APR-03
**Success Criteria** (what must be TRUE):
  1. System picks 1 unprocessed topic from Topics sheet and generates a complete 60-second storyboard
  2. Each scene row in Storyboards sheet includes: scene number, duration, visual description, visual type, narration (Taglish), on-screen text, AI prompt, and status dropdown
  3. Storyboard totals exactly 60 seconds across all scenes
  4. Asset generation workflow only triggers when ALL scenes for a storyboard are marked Approved
  5. Rejected scenes can be manually edited in Google Sheets and status reset to Needs Approval for re-processing
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Research & Orchestration
**Goal**: System discovers trending topics, logs them, rotates content pillars, and orchestrates full pipeline
**Depends on**: Phase 4
**Requirements**: RES-01, RES-02, RES-03, RES-04
**Success Criteria** (what must be TRUE):
  1. System discovers trending topics from Perplexity API relevant to meal boxes, food packaging, and food business
  2. System discovers trending topics from TikTok hashtags/sounds in the food/business space
  3. Discovered topics are logged to Topics sheet with title, source, summary, trend score, date, and status (New / Selected / Used)
  4. System auto-rotates between 3 content pillars: packaging tips & trends, food business growth, customer transformations
  5. End-to-end pipeline runs: Research → Storyboard → Approval (manual) → Asset Generation → Render → Delivery, producing 1 video per day
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Schema | 3/3 | Complete | 2026-02-10 |
| 2. Remotion Render API | 3/3 | Complete | 2026-02-10 |
| 3. Asset Generation | 3/3 | Complete | 2026-02-11 |
| 4. Storyboard & Approval | 0/2 | Not started | - |
| 5. Research & Orchestration | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-10*
*Last updated: 2026-02-11 (Phase 3 complete)*
