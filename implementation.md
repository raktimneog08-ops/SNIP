# Snip: Chrome Side-Panel AI Agent - Phase-Wise Implementation Plan

This document defines the 4-phase technical roadmap for building **Snip**, incorporating all architecture patterns from `architecture.md` and defensive error-handling strategies from `edgecase.md`.

---

## Roadmap Overview

```
Phase 1: The Eyes (Read the Web)
├── 1.1 Manifest V3 & Extension Foundation
├── 1.2 Mozilla Readability.js & Page Extraction
├── 1.3 Gemini AI Client & Bilingual Prompt Engineering
├── 1.4 Structured Article Summarizer
├── 1.5 Public YouTube Video Summarizer & Timestamp Seeking
└── 1.6 Selected Text Explainer

Phase 2: The Brain (Understand Page & Screen)
├── 2.1 In-Context Grounded Page Chat (Streaming & History)
├── 2.2 Chrome Context Menu Quick Actions (Explain, Translate, Draft Reply)
└── 2.3 Screen Vision: Screenshot Capture & Gemini Vision Q&A

Phase 3: The Hands (Element Detection & Action Engine)
├── 3.1 Interactive DOM Element Scanner & Viewport Geometry
├── 3.2 Non-Intrusive Numbered Badge Overlay Engine
├── 3.3 Gemini Single-Step Action Planner & JSON Parser
├── 3.4 Human-In-The-Loop Controller (Approve, Skip, Stop)
└── 3.5 Synthetic Event Dispatcher & Action Audit Log

Phase 4: The Memory & Safety Shield (Profile, Skills & Production Polish)
├── 4.1 Local User Profile Storage & Form Autofill Matcher
├── 4.2 One-Click Saved Skills Library
├── 4.3 Safety Guardrails (Blacklisted Domains & Sensitive Fields)
├── 4.4 Global Error Handling & Network Resilience
├── 4.5 Automated Unit Test Suite (`node --test`)
└── 4.6 Packaging & Comprehensive README Documentation
```

---

## Phase 1: The Eyes - Read the Web

### Objective
Establish the Manifest V3 Chrome Extension framework, build the Side Panel UI shell, connect the Google Gemini API, and enable intelligent reading and structured summarization of articles and YouTube videos in English and Hinglish.

### Tasks & File Architecture

#### Task 1.1: Extension Foundation & Side Panel Shell
- **Files:** `manifest.json`, `background/service-worker.js`, `sidepanel/sidepanel.html`, `sidepanel/sidepanel.css`, `sidepanel/sidepanel.js`, `icons/`
- **Details:**
  - Create MV3 `manifest.json` with permissions: `sidePanel`, `activeTab`, `scripting`, `storage`, `contextMenus`, `tabs`.
  - Configure `background/service-worker.js` with `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
  - Build modern Side Panel UI with tab navigation (**Summarize**, **Chat**, **Agent**, **Vision**, **Profile**, **Settings**).
  - Implement secure API key entry and model selection in Settings tab, persisted in `chrome.storage.local`.
- **Edge Case Protection:** Handle unconfigured API keys with polite prompt toasts; gracefully handle permission initialization.

#### Task 1.2: Page Content Extraction & Readability Integration
- **Files:** `vendor/Readability.js`, `content/content.js`
- **Details:**
  - Vendor Mozilla Readability.js for clean, ad-free article parsing.
  - Implement message handler in `content.js` for `EXTRACT_ARTICLE`.
  - Strip clutter (scripts, styles, navigation, ads, footers).
  - Extract page metadata: title, URL, byline, text content, estimated reading time.
- **Edge Case Protection:** If Readability returns null (e.g. web apps or forums), fall back to sanitized `document.body.innerText`. Apply hierarchical truncation if text exceeds 40,000 characters.

#### Task 1.3: Gemini AI Client & Bilingual Prompt Engine
- **Files:** `services/gemini.js`, `services/prompts.js`
- **Details:**
  - Direct REST / SSE client for `generativelanguage.googleapis.com/v1beta`.
  - Support models: `gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash-8b`.
  - Support streaming chunks via `ReadableStream`.
  - Bilingual prompt engineering:
    - **English:** Concise, analytical, crisp formatting.
    - **Hinglish:** Natural conversational mixture of Hindi and English written in Latin script (e.g., *"Is article mein 5 main points explain kiye gaye hain..."*).
- **Edge Case Protection:** Exponential backoff retry on HTTP 429; display clear countdown when rate-limited.

#### Task 1.4: Article Summarizer
- **Files:** `sidepanel/sidepanel.js`, `sidepanel/summarize.js`
- **Details:**
  - Formats output into strict structure:
    1. **One-Line TL;DR** (highlighted callout).
    2. **5 Key Points** (bulleted takeaways).
    3. **What To Do Next / Actionable Takeaways**.
  - Language toggle button `[ English | Hinglish ]` in the side panel header.

#### Task 1.5: YouTube Video Summarizer & Clickable Timestamps
- **Files:** `content/youtube.js`, `sidepanel/summarize.js`
- **Details:**
  - Content script detects `youtube.com/watch` or `youtu.be` URLs.
  - Extracts video ID, title, channel name, video description, and available caption cues.
  - AI generates chapter-style notes with timestamp links (e.g. `[02:15] Introduction to Neural Nets`).
  - Clicking any timestamp sends `SEEK_YOUTUBE` to content script, which sets `video.currentTime = targetSeconds` and triggers playback.
- **Edge Case Protection:** If captions are disabled, summarize using title and video description. If ads are running, notify user without crashing.

#### Task 1.6: Selected Text Explainer
- **Files:** `content/content.js`, `sidepanel/sidepanel.js`
- **Details:**
  - Capture text highlighted by the user on the active page via `window.getSelection().toString()`.
  - Provide a one-click **"Explain Selection"** card in the side panel that explains complex terms in plain language.

---

## Phase 2: The Brain - Understand the Page and the Screen

### Objective
Transform the side panel into a context-aware conversational agent that answers questions strictly from page context, integrates context menus into Chrome's right-click flow, and supports screenshot-based multimodal vision queries.

### Tasks & File Architecture

#### Task 2.1: Grounded In-Context Page Chat
- **Files:** `sidepanel/chat.js`
- **Details:**
  - Dedicated chat tab maintaining conversation history for the current page session.
  - System prompt grounds assistant strictly to page content:
    > *"You are Snip. Answer the user's questions ONLY using the extracted page context provided below. If the answer cannot be determined from the context, state clearly: 'This information is not available on the current page.' Do not hallucinate or use external assumptions."*
  - Real-time streaming response token rendering.
  - Copy answer button and clear chat button.
- **Edge Case Protection:** Handles page navigation by warning user if chat context belongs to a previous page; handles network disconnection gracefully.

#### Task 2.2: Chrome Right-Click Context Menus
- **Files:** `background/context-menus.js`, `background/service-worker.js`, `sidepanel/sidepanel.js`
- **Details:**
  - Registers 3 context menu actions for `selection`:
    1. **"Snip: Explain this"**: Simplifies selected jargon or technical text.
    2. **"Snip: Translate"**: Translates selected text to Hindi/Hinglish or English.
    3. **"Snip: Draft a reply"**: Generates professional, polite reply drafts (for emails, LinkedIn posts, tweets, forum comments).
  - Clicking any context menu opens the side panel (if closed) and streams the generated response immediately.

#### Task 2.3: Screen Vision Q&A (Multimodal Analysis)
- **Files:** `services/vision.js`, `sidepanel/vision.js`, `background/service-worker.js`
- **Details:**
  - User clicks **"Capture Screen"** in the Vision tab.
  - Service worker calls `chrome.tabs.captureVisibleTab(null, { format: 'png' })`.
  - Image is displayed as a thumbnail preview in the side panel.
  - User can ask visual questions: *"Explain this chart"*, *"What does this diagram mean?"*, *"Transcribe the table in this image"*.
  - Base64 payload is dispatched to `gemini-1.5-flash` with the visual query.
- **Edge Case Protection:** Image compression if PNG exceeds size thresholds; clear error if tab cannot be captured (e.g. Chrome Web Store or internal URLs).

---

## Phase 3: The Hands - Interactive Element Detection & Action Engine

### Objective
Turn interactive web elements into a numbered Action Map, render non-intrusive badge overlays on the active page, reason about single-step browser actions, and execute approved browser tasks with strict human-in-the-loop oversight.

### Tasks & File Architecture

#### Task 3.1: Interactive DOM Element Scanner
- **Files:** `content/element-scanner.js`
- **Details:**
  - Scans DOM for interactive elements: `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`, `[role="button"]`, `[role="link"]`, `[role="checkbox"]`, `[tabindex="0"]`.
  - Filters out hidden nodes: `display === 'none'`, `visibility === 'hidden'`, `opacity === '0'`, `offsetParent === null`, zero bounding boxes.
  - Computes viewport-relative bounding rects (`getBoundingClientRect`).
  - Assigns unique integer IDs: `1, 2, 3, ... N`.
  - Extracts human-readable labels: `aria-label`, innerText, placeholder, title, or adjacent label element.
  - Evaluates sensitivity flag `isSensitive: boolean` (passwords, cards, CVV).

#### Task 3.2: Numbered Visual Overlay Engine
- **Files:** `content/overlay.js`, `content/overlay.css`
- **Details:**
  - Injects isolated `<div id="snip-action-overlay-root">` at root of document.
  - Mounts numbered badges (`<span class="snip-badge">1</span>`) over each detected element.
  - Badges feature high-contrast styling (vibrant blue with white text, subtle shadow).
  - `pointer-events: none` on badges ensures user clicks pass through to underlying elements without interference.
  - Auto-updates badge positions on scroll and window resize.
  - Message handler `TOGGLE_OVERLAY` to show, hide, or clear badges.

#### Task 3.3: Action Reasoning & JSON Planner
- **Files:** `services/agent-planner.js`
- **Details:**
  - Takes user browser task (e.g., *"Fill the contact form with my details and click Submit"*).
  - Sends task prompt + compact list of available numbered elements to Gemini:
    ```
    Goal: Fill the contact form with John Doe (john@example.com)
    Available Elements:
    [1] INPUT (type="text", label="Full Name", placeholder="Enter name")
    [2] INPUT (type="email", label="Email Address", placeholder="name@company.com")
    [3] BUTTON (label="Submit Message")
    ```
  - Constrains Gemini to output single next action in strict JSON schema:
    ```json
    {
      "action": "TYPE",
      "elementId": 1,
      "value": "John Doe",
      "rationale": "Filling Full Name input field",
      "isFinalStep": false
    }
    ```

#### Task 3.4: Human-in-the-Loop Controller Card
- **Files:** `sidepanel/agent.js`, `sidepanel/sidepanel.html`
- **Details:**
  - Displays proposed step clearly in the Side Panel:
    - **Action Type:** `CLICK`, `TYPE`, `SELECT`.
    - **Target:** Element #[N] - Label / Type.
    - **Value:** Injected text or selected option.
    - **AI Rationale:** Explanation of why this step is proposed.
  - Interactive Action Controls:
    - **[Approve & Execute]**: Dispatches execution to content script.
    - **[Skip This Action]**: Asks AI for alternative action without executing.
    - **[Stop Agent]**: Halts workflow immediately and removes overlay badges.

#### Task 3.5: Synthetic Action Executor & Action Audit Log
- **Files:** `content/action-executor.js`, `sidepanel/agent.js`
- **Details:**
  - `CLICK`: Scrolls element into view, dispatches `pointerdown`, `mousedown`, `focus`, `mouseup`, `click`.
  - `TYPE`: Focuses element, uses React 16+ prototype setter trick to ensure state updates, sets value, dispatches `input` and `change` events.
  - `SELECT`: Changes select index and fires `change` event.
  - Dispatches `EXECUTE_ACTION` result back to side panel.
  - Appends record to Action Audit Log: Timestamp, URL, Action, Target, Status (**SUCCESS**, **SKIPPED**, **STOPPED**).
  - Logs are persisted in `chrome.storage.local` and can be exported as JSON or cleared.

---

## Phase 4: The Memory & Safety Shield (Profile, Skills & Polish)

### Objective
Implement local user profile storage and form autofill, one-click saved skills, safety guardrails preventing dangerous automation, comprehensive error handling, automated test suite, release packaging, and complete documentation.

### Tasks & File Architecture

#### Task 4.1: Local User Profile & Form Autofill Engine
- **Files:** `services/profile.js`, `sidepanel/profile.js`
- **Details:**
  - Side panel profile management form: Full Name, Email, Phone, Address, City, State, Zip, Country, Job Title, Company, Bio, Custom Notes.
  - All data stays 100% local in `chrome.storage.local`.
  - Form field heuristic matcher: Maps input names, IDs, placeholders, and labels to corresponding profile fields.
  - Quick action: **"Autofill Form from Profile"** scans page and proposes pre-filled values for user approval.

#### Task 4.2: One-Click Saved Skills Library
- **Files:** `services/skills.js`, `sidepanel/skills.js`
- **Details:**
  - Built-in skills:
    1. *"Summarize & Extract Action Items"*
    2. *"Draft Polite Follow-Up Reply"*
    3. *"Explain Technical Concepts to a 10-Year-Old"*
    4. *"Extract Key Tables / Data Points"*
  - Custom skill creator: Users can add their own prompt templates with `{page_content}` and `{selection}` placeholders.

#### Task 4.3: Safety Guardrails & Blacklist Engine
- **Files:** `services/safety.js`
- **Details:**
  - Evaluates current page URL and targets:
    - Internal Chrome URLs (`chrome://`, `chrome-extension://`).
    - Known banking and financial patterns (`*bank*`, `*paypal*`, `*stripe*`, checkout pages).
  - Checks input element types: `input[type="password"]`, credit cards, CVVs, OTPs.
  - Hard-blocks automated typing into password or financial fields.
  - Shows clear, non-intrusive Safety Shield status banner in the Side Panel header.

#### Task 4.4: Global Error Handling & Network Resilience
- **Files:** `sidepanel/error-handler.js`
- **Details:**
  - Centralized notification system: Toast alerts, retry countdowns, error banners.
  - Explicit handlers for:
    - Missing / invalid Gemini API keys.
    - Network disconnections and stream timeouts.
    - HTTP 429 rate limit with automatic exponential backoff retry.
    - Target tab closed or reloaded.
    - Page execution errors (e.g. Chrome Web Store restricted pages).

#### Task 4.5: Automated Unit Test Suite
- **Files:** `tests/unit/*.test.js`, `package.json`
- **Details:**
  - Uses native Node.js test runner (`node --test`) without third-party dependencies:
    - `gemini-prompts.test.js`: Verifies prompt templates and Hinglish output configurations.
    - `safety.test.js`: Validates URL blacklist and sensitive input blockers.
    - `profile-autofill.test.js`: Tests heuristic attribute matching against profile keys.
    - `youtube-parser.test.js`: Tests video ID extraction and timestamp conversions.
    - `agent-planner.test.js`: Tests JSON action parsing, validation, and sanitization.

#### Task 4.6: Production Packaging & Comprehensive README
- **Files:** `README.md`, `scripts/build-package.js`
- **Details:**
  - Comprehensive `README.md`: Feature breakdown, installation guide for Chrome (**Load unpacked**), API key setup, architecture diagram, security guarantees, and usage examples.
  - Node.js packaging script `scripts/build-package.js` producing a distributable `dist/snip-v1.0.0.zip` ready for GitHub Releases.

---

## Acceptance Criteria & Definition of Done

1. [x] Architectural documentation complete (`architecture.md`, `edgecase.md`, `implementation.md`).
2. [ ] Extension loads unpacked in Chrome with zero manifest errors.
3. [ ] Side panel opens and displays responsive, intuitive UI across all tabs.
4. [ ] Gemini API key configured and stored securely in `chrome.storage.local`.
5. [ ] Article summarizer generates TL;DR, 5 Key Points, and Next Steps in English and Hinglish.
6. [ ] YouTube summarizer produces chapter notes with clickable timestamps that seek the video.
7. [ ] In-page grounded chat streams answers and declines to hallucinate external info.
8. [ ] Context menu actions (Explain, Translate, Draft reply) route to side panel seamlessly.
9. [ ] Vision tab captures visible tab and answers questions on images/charts.
10. [ ] Element scanner generates numbered action map and non-intrusive page badges.
11. [ ] Agent proposes single actions with **Approve**, **Skip**, and **Stop** buttons.
12. [ ] Approved actions execute safely on the DOM (clicks, typed inputs, dropdowns).
13. [ ] User profile enables local form autofill proposals.
14. [ ] Safety shield completely blocks passwords, credit cards, and banking domains.
15. [ ] All unit tests pass cleanly with `npm test`.
16. [ ] Release ZIP is generated and `README.md` is complete and thorough.
