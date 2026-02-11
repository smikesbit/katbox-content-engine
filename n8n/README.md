# n8n Workflows for Katbox Content Engine

This directory contains importable n8n workflow templates for orchestrating the Katbox automated content pipeline.

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

### 2. Asset Generation Workflow

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

## Workflow Architecture

The Katbox content pipeline uses **4 separate n8n workflows** for clean separation of concerns:

1. **Research Workflow** — Trend discovery and topic selection
2. **Storyboard Workflow** — Script and scene generation
3. **Asset Generation Workflow** (this file) — AI video/photo/voiceover production
4. **Render Workflow** — Final video assembly and export

Each workflow reads from and writes to Google Sheets, creating a state-driven pipeline where each stage can be monitored and controlled independently.

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
