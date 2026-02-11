# n8n Workflows for Katbox Content Engine

This directory contains importable n8n workflow templates for orchestrating the Katbox automated content pipeline.

## Workflow Architecture

The Katbox content pipeline uses **4 separate n8n workflows** for clean separation of concerns:

1. **Research Workflow** (future) — Trend discovery and topic selection
2. **Storyboard Workflow** — Reads topics, generates storyboards, writes scenes to Google Sheets
3. **Approval Gate Workflow** — Monitors approval status and triggers asset generation when ready
4. **Asset Generation Workflow** — Generates AI video/photo/voiceover for approved scenes

Each workflow reads from and writes to Google Sheets, creating a state-driven pipeline where each stage can be monitored and controlled independently. The **ONLY manual step** in the entire pipeline is human approval of storyboard scenes in Google Sheets.

---

## Complete Pipeline Flow

```
[Topics Sheet: status=New]
        ↓
[Workflow 2: Storyboard Generation]
        ↓
[Storyboards Sheet: approval_status=Needs Approval] ← HUMAN REVIEWS HERE (only manual step)
        ↓
[Workflow 3: Approval Gate] ← Checks all scenes approved
        ↓
[Workflow 4: Asset Generation]
        ↓
[Assets Sheet: asset_status=DONE]
        ↓
[Workflow 5: Render Pipeline] (future)
        ↓
[Completed Videos Sheet]
```

---

## Workflows

### 1. Error Handling Workflow

**Purpose:** Centralized error handler for all workflows in the pipeline.

**File:** `error-workflow.json`

**Setup:**
1. Import the workflow JSON into n8n
2. Configure Slack/Email credentials for notifications
3. Note the workflow ID after import
4. Reference this ID in other workflows' error handlers

**Features:**
- Centralized error logging
- Notification via Slack/Email
- Error context capture (workflow name, timestamp, error details)
- Retry logic integration

---

### 2. Storyboard Generation Workflow

**Purpose:** Picks an unprocessed topic, calls the storyboard generation API, and writes scene rows to Google Sheets with "Needs Approval" status.

**File:** `storyboard-workflow.json`

**Import Instructions:**
1. In n8n, go to **Workflows** → **Import from File**
2. Select `storyboard-workflow.json`
3. Click **Import**
4. The workflow will appear in your workflows list

**Configuration Steps:**

1. **Google Sheets Credentials**
   - Go to **Credentials** → **Add Credential** → **Google Sheets OAuth2 API**
   - Follow OAuth2 flow to grant access to your Google Sheets
   - Update all Google Sheets nodes to use your credentials:
     - "Read Unprocessed Topics" node
     - "Update Topic Status to Selected" node
     - "Write Scenes to Sheets" node
     - "Update Topic Status to Used" node
     - "Reset Topic Status to New" node

2. **Set Spreadsheet ID**
   - Open the "Read Config" node
   - Replace `CONFIGURE_YOUR_GOOGLE_SHEETS_ID` with your actual Google Sheets ID
   - (The Sheets ID is in the URL: `docs.google.com/spreadsheets/d/{SHEETS_ID}/edit`)

3. **Render Server URL**
   - Default: `https://render.digitalcallum.com`
   - Change in "Read Config" node if using a different server
   - This URL is used for all HTTP requests to the storyboard generation API

4. **Link to Error Workflow**
   - Import `error-workflow.json` first (if not already done)
   - Open "Trigger Error Workflow" node
   - Replace `ERROR_WORKFLOW_ID` with the actual error workflow ID
   - (Find workflow ID in n8n workflow settings)

5. **Schedule Automation (Optional)**
   - For automated runs, add a **Schedule Trigger** node
   - Set frequency (e.g., "Every day at 9:00 AM")
   - Connect it to "Read Config" node
   - Disable Manual Trigger if using scheduled automation

**Workflow Flow:**

```
[Manual Trigger]
        ↓
   [Read Config] ← Sets spreadsheet ID and server URL
        ↓
[Read Unprocessed Topics] ← Reads 1 topic from Topics tab where status="New" (FIFO)
        ↓
[Check if Topic Found] ← Stop if no topics
        ↓
[Update Topic Status to Selected] ← Marks topic as Selected to prevent duplicate processing
        ↓
[Trigger Storyboard Generation] ← POST to /storyboard/generate
        ↓
   [Wait 10s] ← Polling delay
        ↓
[Poll Job Status] ← GET /storyboard/generate/{jobId}
        ↓
[Check if Completed] ← Loop back to Wait if not completed
        ↓
[Transform Scenes to Rows] ← Convert scene array to individual row items
        ↓
[Write Scenes to Sheets] ← Append each scene as a row to Storyboards tab with approval_status="Needs Approval"
        ↓
[Update Topic Status to Used] ← Marks topic as Used after successful storyboard creation
```

**Error Handling:**

If storyboard generation fails:
- Topic status is reset to "New" so it can be retried
- Error workflow is triggered for notifications

**Generated Scene Fields:**

Each scene row in the Storyboards sheet contains:
- `storyboard_id` — Format: SB-{topicId}
- `topic_id` — Original topic ID
- `scene_number` — Scene sequence (1, 2, 3, etc.)
- `duration_seconds` — Scene duration (3-15s, total = 60s)
- `visual_description` — Human-readable description
- `visual_type` — ai-video, ai-photo, or motion-graphics
- `narration_text` — Taglish voiceover script
- `onscreen_text` — Text overlay content
- `ai_prompt` — Optimized prompt for AI generation
- `approval_status` — Set to "Needs Approval"
- `created_at` — Timestamp

**Topic Status Flow:**
- **New** → Topic available for storyboard generation
- **Selected** → Storyboard generation in progress
- **Used** → Storyboard completed, topic consumed

**Triggering the Workflow:**

**Manual Trigger:**
- Click "Execute Workflow" button in n8n
- Workflow runs immediately and processes 1 topic

**Webhook Trigger:**
- Enable the webhook trigger node
- Workflow creates a unique webhook URL
- External systems can POST to this URL to trigger workflow

**Schedule Trigger (recommended for production):**
- Add Schedule Trigger node for daily/hourly runs
- Automatically processes topics at set intervals

---

### 3. Approval Gate Workflow

**Purpose:** Monitors storyboard scenes for full approval and triggers asset generation when ALL scenes in a storyboard are approved.

**File:** `approval-gate-workflow.json`

**Import Instructions:**
1. In n8n, go to **Workflows** → **Import from File**
2. Select `approval-gate-workflow.json`
3. Click **Import**
4. The workflow will appear in your workflows list

**Configuration Steps:**

1. **Google Sheets Credentials**
   - Use the same credentials as storyboard workflow
   - Update all Google Sheets nodes:
     - "Read All Storyboards" node
     - "Update asset_status to READY" node

2. **Set Spreadsheet ID**
   - Open the "Read Config" node
   - Replace `CONFIGURE_YOUR_GOOGLE_SHEETS_ID` with your actual Google Sheets ID
   - Must be the same sheet as used in storyboard workflow

3. **Render Server URL**
   - Default: `https://render.digitalcallum.com`
   - Change in "Read Config" node if using a different server

**Workflow Flow:**

```
[Schedule Trigger: Every 30 minutes]
        ↓
   [Read Config] ← Sets spreadsheet ID and server URL
        ↓
[Read All Storyboards] ← Reads ALL scenes from Storyboards tab
        ↓
[Group by Storyboard ID] ← Groups scenes by storyboard_id and checks:
                           • Are ALL scenes approval_status = "Approved"?
                           • Has asset generation NOT started yet?
        ↓
[Check if Any Ready] ← Stop if no storyboards are fully approved
        ↓
[Limit to 1 Storyboard] ← Process only 1 storyboard per run to avoid overload
        ↓
[Update asset_status to READY] ← Explicitly set asset_status=READY for all scenes
        ↓
[Transform for API] ← Convert Google Sheets format to asset generation API format
        ↓
[Trigger Asset Generation] ← POST to /assets/generate
        ↓
   [Log Success] ← Log storyboard ID and job ID
```

**How It Works:**

This workflow is the **bridge between human approval and automated asset generation**. It's the gateway that ensures the ONLY manual step (storyboard approval) correctly gates downstream processing.

1. **Runs every 30 minutes** (configurable via Schedule Trigger)
2. **Reads ALL scenes** from Storyboards tab
3. **Groups by storyboard_id** and identifies storyboards where:
   - ALL scenes have `approval_status = "Approved"`
   - No asset generation has started (`asset_status` is empty or "READY")
4. **Limits to 1 storyboard** per run to prevent overwhelming the system
5. **Sets asset_status = "READY"** for all scenes of the selected storyboard
6. **Triggers asset generation** by calling POST /assets/generate

**Scheduling Recommendations:**

- **Every 30 minutes** (default) — Good balance for production
- **Every 10 minutes** — For faster turnaround during testing
- **Every hour** — For lower-volume pipelines

**Human Approval Process:**

The workflow expects humans to:
1. Open Google Sheets
2. Review each scene in the Storyboards tab
3. Set `approval_status` to:
   - **"Approved"** — Scene is good, proceed to asset generation
   - **"Rejected"** — Scene needs changes (user can edit and reset to "Needs Approval")
   - **"Needs Approval"** — Default status, not yet reviewed

Once ALL scenes for a storyboard have `approval_status = "Approved"`, the approval gate workflow will automatically trigger asset generation on its next run.

**Monitoring:**

- **In n8n:** Check workflow execution history
  - "No items found" → No storyboards are fully approved yet
  - Success → A storyboard was sent for asset generation
- **In Google Sheets:** Monitor the `asset_status` column in Storyboards tab
  - Empty or "READY" → Awaiting asset generation trigger
  - "IN_PROGRESS" → Asset generation triggered by next workflow

---

### 4. Asset Generation Workflow

**Purpose:** Generates AI assets (video, photo, voiceover) for approved storyboard scenes.

**File:** `asset-generation-workflow.json`

**Import Instructions:**
1. In n8n, go to **Workflows** → **Import from File**
2. Select `asset-generation-workflow.json`
3. Click **Import**
4. The workflow will appear in your workflows list

**Configuration Steps:**

1. **Google Sheets Credentials**
   - Go to **Credentials** → **Add Credential** → **Google Sheets OAuth2 API**
   - Follow OAuth2 flow to grant access to your Google Sheets
   - Update all Google Sheets nodes to use your credentials:
     - "Read Approved Scenes" node
     - "Update Status to IN_PROGRESS" node
     - "Write Asset URLs to Sheets" node
     - "Update Failed Status" node

2. **Set Spreadsheet ID**
   - Open the "Read Config" node
   - Replace `CONFIGURE_YOUR_GOOGLE_SHEETS_ID` with your actual Google Sheets ID
   - (The Sheets ID is in the URL: `docs.google.com/spreadsheets/d/{SHEETS_ID}/edit`)

3. **Render Server URL**
   - Default: `https://render.digitalcallum.com`
   - Change in "Read Config" node if using a different server
   - This URL is used for all HTTP requests to the asset generation API

4. **Link to Error Workflow**
   - Import `error-workflow.json` first (if not already done)
   - Open "Trigger Error Workflow" node
   - Replace `ERROR_WORKFLOW_ID` with the actual error workflow ID
   - (Find workflow ID in n8n workflow settings)

5. **Schedule Automation (Optional)**
   - For automated runs, add a **Schedule Trigger** node
   - Set frequency (e.g., "Every day at 8:00 AM")
   - Connect it to "Read Config" node
   - Disable Manual Trigger if using scheduled automation

**Workflow Flow:**

```
[Manual/Webhook Trigger]
        ↓
   [Read Config] ← Sets spreadsheet ID and server URL
        ↓
[Read Approved Scenes] ← Queries Google Sheets for status="Approved" AND asset_status="READY"
        ↓
[Group by Storyboard] ← Groups scenes by storyboard_id
        ↓
[Check if Scenes Exist] ← Only proceed if scenes found
        ↓
[Update Status to IN_PROGRESS] ← Marks scenes as in-progress in Assets tab
        ↓
[Trigger Asset Generation] ← POST to /assets/generate endpoint
        ↓
   [Wait 30s] ← Polling delay
        ↓
[Poll Job Status] ← GET /assets/generate/{jobId}
        ↓
[Check if Completed] ← Loop back to Wait if not completed
        ↓
 [Process Results] ← Extract URLs and metadata from completed job
        ↓
[Write Asset URLs to Sheets] ← Update Assets tab with video_url, photo_url, voiceover_url, etc.
```

**Error Handling:**

If asset generation fails:
- Status is updated to "FAILED" in Google Sheets
- Error message is written to `error_message` column
- Error workflow is triggered for notifications

**Triggering the Workflow:**

**Manual Trigger:**
- Click "Execute Workflow" button in n8n
- Workflow runs immediately

**Webhook Trigger:**
- Workflow creates a unique webhook URL
- External systems can POST to this URL to trigger workflow
- Use for event-driven automation (e.g., after storyboard approval)

**Schedule Trigger (recommended for production):**
- Add Schedule Trigger node for daily/hourly runs
- Automatically checks for approved scenes at set intervals

**Monitoring:**

- **In n8n:** Check workflow execution history for success/failure
- **In Google Sheets:** Monitor the `asset_status` column in the Assets tab
  - `READY` → Scene approved, awaiting generation
  - `IN_PROGRESS` → Asset generation in progress
  - `DONE` → Assets generated successfully
  - `FAILED` → Generation failed (see `error_message` column)

**Generated Assets:**

Successfully generated assets are stored on the render server and accessible via:
- `video_url` — AI-generated video (Kling 2.6) for ai-video scenes
- `photo_url` — AI-generated photo (Flux 2 Pro) for ai-photo scenes
- `voiceover_url` — AI-generated voiceover (ElevenLabs TTS) for all scenes
- `motion_config` — Motion graphics config JSON for motion-graphics scenes

All URLs point to the render server's `/assets/` directory (e.g., `https://render.digitalcallum.com/assets/{filename}`).

**Polling Behavior:**

- The workflow polls the job status every 30 seconds
- Maximum polling duration: 30 minutes (60 iterations)
- If job doesn't complete within 30 minutes, workflow times out and marks as failed
- Adjust the Wait node duration if you need longer polling intervals

**Troubleshooting:**

- **No scenes found:** Check that scenes in Storyboards tab have `status="Approved"` and `asset_status="READY"`
- **401/403 errors:** Verify render server is running and accessible
- **Google Sheets errors:** Verify OAuth2 credentials are properly configured
- **Timeout errors:** Check render server logs for asset generation failures
- **Partial failures:** If some scenes succeed and others fail, successfully generated assets are still saved to Sheets

---

## Further Customization

**Changing AI Models:**
Asset generation is handled by the render server. To change models (e.g., different voiceover voice, different image style):
- Modify the server's Kie AI client configuration
- No changes needed in n8n workflow

**Adding Custom Validation:**
- Add IF nodes after "Read Approved Scenes" to validate scene data
- Add Function nodes to transform or enrich scene data before generation

**Batching:**
- Current workflow processes all approved scenes at once
- To limit batch size, add a Limit node after "Read Approved Scenes"

**Retry Logic:**
- For failed scenes, add a Loop node to retry generation N times
- Check `asset_status="FAILED"` and retry with exponential backoff

---

## Support

For issues with:
- **n8n workflow setup:** Check n8n documentation or community forums
- **Render server API:** Check server logs at `/var/log/` on VPS
- **Asset generation failures:** Review Kie AI API status and rate limits
- **Google Sheets integration:** Verify OAuth2 scopes include Sheets read/write access
