# Snip: Chrome Side-Panel AI Agent - Edge Cases & Defensive Strategies

This document catalogs critical technical edge cases across DOM manipulation, Chrome Extension lifecycle, multi-modal AI reasoning, YouTube media handling, and human-in-the-loop safety, along with the concrete defensive strategies implemented in Snip.

---

## 1. Single Page Applications (SPAs) & Dynamic DOM Mutations

### 1.1 Stale Element References After Page Re-render
- **Edge Case:** Modern web frameworks (React, Vue, Angular, Svelte) frequently re-render the DOM, destroying and replacing nodes. If an action map was generated at \(T_0\), and the user approves an action at \(T_1\), the target DOM element pointer may be detached from the active document tree.
- **Defensive Strategy:**
  1. Store durable identifying fingerprints for every scanned element: CSS path selector, element tag, `name`, `id`, `aria-label`, placeholder text, and text content snapshot.
  2. Before executing an action on element index \(N\), verify `document.contains(element)`.
  3. If detached, query the DOM using the fallback fingerprint hierarchy (`#id` -> `[name="..."]` -> `[aria-label="..."]` -> CSS selector).
  4. If the element cannot be resolved with high confidence, fail gracefully with: `"Target element changed or re-rendered on page. Please re-scan."` and clear stale overlays.

### 1.2 Infinite Scrolling & Lazy-Loaded Content
- **Edge Case:** Scrolling loads new elements dynamically, altering page layout, while offscreen elements may have been indexed.
- **Defensive Strategy:**
  1. Only index and badge elements currently visible or near the active viewport window.
  2. Provide a visible **"Re-scan Page"** button in the Agent tab.
  3. Listen to `scroll` and `resize` events with a 200ms debounce to recalculate badge overlay coordinates (`getBoundingClientRect`).

---

## 2. DOM Layout, Scrolling, Viewports & Overlays

### 2.1 Sticky Headers, Modals & Floating Overlays Obscuring Elements
- **Edge Case:** Fixed navigation bars (`position: fixed`) or cookie consent banners sit above interactive elements. Dispatched synthetic click events or badges might hit the overlay instead of the intended target.
- **Defensive Strategy:**
  1. Use `document.elementFromPoint(x, y)` to verify that the target element (or its direct child) is the topmost hit-testable node.
  2. If obscured by a modal backdrop or header, scroll the target element smoothly into view:
     ```javascript
     element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
     ```
  3. Recompute bounding box after scroll animation completes before badge positioning or synthetic click.

### 2.2 Badges Obstructing User Reading or Clicks
- **Edge Case:** Numbered badges (`[1]`, `[2]`, etc.) overlay text or prevent the user from clicking normally.
- **Defensive Strategy:**
  1. Render badges with `pointer-events: none` on the badge container so user clicks pass through uninhibited.
  2. Position badge markers at the top-left corner of the element border (`transform: translate(-50%, -50%)`) with semi-transparent high-contrast styling.
  3. Provide an instant **"Hide Badges"** toggle in the side panel.

---

## 3. Shadow DOM, Custom Elements & Cross-Origin iframes

### 3.1 Shadow DOM Components
- **Edge Case:** Modern design systems (e.g., Salesforce Lightning, Shoelace, Material Web) wrap buttons and inputs inside Open or Closed Shadow Roots. `document.querySelectorAll` fails to pierce shadow boundaries.
- **Defensive Strategy:**
  1. Implement a recursive DOM walker:
     ```javascript
     function walkDOM(node, callback) {
       callback(node);
       if (node.shadowRoot) {
         walkDOM(node.shadowRoot, callback);
       }
       for (const child of node.children) {
         walkDOM(child, callback);
       }
     }
     ```
  2. For closed shadow roots (which cannot be pierced by script), detect host element boundaries and attach interaction to the custom element host.

### 3.2 Cross-Origin iframes (Payment gateways, Google Sign-in, Ads)
- **Edge Case:** Cross-origin iframes (e.g., Stripe Elements, PayPal iframes, reCAPTCHA) block content script access due to browser Same-Origin Policy.
- **Defensive Strategy:**
  1. Mark iframe elements as restricted/sandboxed.
  2. Do not attempt to traverse or click inside cross-origin iframes.
  3. Inform the user in the Side Panel: `"Action inside secure cross-origin frame requires manual completion."`

---

## 4. Sensitive Information & Security Guardrails

### 4.1 Password Fields and Credentials
- **Edge Case:** The page contains `<input type="password">`, login credentials, or password confirmation fields.
- **Defensive Strategy:**
  1. Hard block: Any input with `type="password"` is tagged with `isSensitive: true` and excluded from automated typing proposals.
  2. If the user asks Snip to fill login credentials, Snip responds:
     > *"For your security, Snip does not automate password entry. Please enter your credentials manually."*

### 4.2 Payment Cards, CVVs & Financial Form Fields
- **Edge Case:** Checkout flows contain credit card numbers, CVVs, expiration dates, or bank routing numbers.
- **Defensive Strategy:**
  1. Check input attributes (`autocomplete="cc-number"`, `autocomplete="cc-csc"`, `name=~"cvv|cvc|cardnumber|routing"`, `inputmode="numeric"` on checkout pages).
  2. If matched, mark element as sensitive and abort any automated fill proposal.

### 4.3 Blacklisted Sensitive Domains
- **Edge Case:** User opens Snip on a banking portal, internal Chrome URL (`chrome://`), or sensitive government site.
- **Defensive Strategy:**
  1. Domain blacklist pattern matching:
     - `chrome://*`, `chrome-extension://*`, `edge://*`
     - Domain keywords: `*banking*`, `*chase.com*`, `*bankofamerica.com*`, `*wellsfargo.com*`, `*paypal.com*`, `*stripe.com*`
  2. Side panel enters **Safety Mode (Read-Only)**: Agent execution tab is disabled; user is notified with an alert banner.

---

## 5. YouTube Media & Content Extraction Anomalies

### 5.1 Missing or Disabled Transcripts
- **Edge Case:** A public YouTube video has disabled captions or is purely instrumental music.
- **Defensive Strategy:**
  1. Attempt to extract captions from available player track data or DOM subtitle container.
  2. If captions are unavailable, fall back seamlessly to extracting the video title, author, description, chapters (if specified in description), and top comments to generate a structured content summary.
  3. Clearly inform user: `"Captions unavailable for this video; summary generated from video description and metadata."`

### 5.2 Clicking Timestamp When Player is Paused or Buffering
- **Edge Case:** User clicks a timestamp link (e.g., `03:45`) in the side panel summary while the video is paused, buffering, or pre-roll ads are playing.
- **Defensive Strategy:**
  1. Send `SEEK_YOUTUBE` message with target seconds to content script.
  2. Content script queries the HTML5 `<video>` element:
     ```javascript
     const video = document.querySelector('video');
     if (video) {
       video.currentTime = targetSeconds;
       video.play().catch(() => {}); // handle autoplay restrictions
     }
     ```
  3. If an ad is currently playing (`.ad-showing` or `.video-ads` active), notify user: `"Ad in progress. Timestamp will apply when main video starts."`

---

## 6. Token Limits, Long Articles & AI Gateway Failures

### 6.1 Extremely Long Articles (>50,000 words)
- **Edge Case:** Scientific papers, massive documentation pages, or infinite blogs exceed prompt context limits or incur high latency.
- **Defensive Strategy:**
  1. Extract article body using `Readability.js` to strip all non-article boilerplate (navs, sidebars, comments).
  2. If extracted text exceeds 40,000 characters (~10,000 tokens), apply smart hierarchical truncation: preserve lead paragraphs, section headings, and concluding sections.
  3. Add a notice in the summary header indicating the article was parsed from key sections.

### 6.2 Gemini API Rate Limits (HTTP 429) & Quota Limits
- **Edge Case:** Free-tier Gemini API hits RPM/TPM limits.
- **Defensive Strategy:**
  1. Exponential backoff with jitter (initial retry 2s, 4s, 8s, max 3 retries).
  2. Friendly error display in the side panel with exact message:
     *"API rate limit reached. Retrying automatically in a moment... (Attempt 2/3)"*
  3. Fallback option to let user switch models (`gemini-1.5-flash-8b` or alternative API key).

### 6.3 Missing or Invalid Gemini API Key
- **Edge Case:** User installs extension and immediately attempts to summarize before entering an API key.
- **Defensive Strategy:**
  1. Immediate validation on action.
  2. Display clear banner: *"Gemini API Key Required. Please visit Settings to enter your free Google AI Studio key."* with direct one-click navigation to the Settings tab.

### 6.4 Streaming Response Drops & Network Disconnections
- **Edge Case:** Network drops mid-SSE stream from Gemini API.
- **Defensive Strategy:**
  1. Keep all text streamed up to the point of disconnect visible in the UI.
  2. Display a *"Connection interrupted. [Retry]"* button rather than clearing the chat bubble.

---

## 7. Chrome Extension Lifecycle & Concurrency

### 7.1 Manifest V3 Service Worker Dormancy
- **Edge Case:** In MV3, the background service worker terminates after ~30 seconds of inactivity to conserve memory. In-memory variables are lost.
- **Defensive Strategy:**
  1. Stateless service worker design: Never store active state in global variables.
  2. All durable state (API keys, preferences, profile, audit log) is persisted in `chrome.storage.local`.
  3. Message handlers are registered synchronously at the top level of `service-worker.js`.

### 7.2 User Switches Tabs While Action Proposal is Pending
- **Edge Case:** User opens Snip on Tab A, asks for a task, and switches to Tab B before approving the action.
- **Defensive Strategy:**
  1. Side panel tracks the tab ID for which the action map was generated (`targetTabId`).
  2. On user clicking **Approve**, verify that the currently active tab matches `targetTabId`.
  3. If the user is on a different tab, display warning: *"Target tab is not active. Switch back to [Page Title] to execute."* and do not perform action on the wrong tab.

### 7.3 User Closes the Target Tab
- **Edge Case:** The web page tab is closed while side panel is still open.
- **Defensive Strategy:**
  1. Content script message calls wrapped in `try/catch` and `chrome.runtime.lastError` checks.
  2. Gracefully handle `"Could not establish connection. Receiving end does not exist"` with user prompt: *"Page tab was closed or reloaded. Please re-open or refresh."*

---

## 8. Framework Form Handling & Synthetic Event Dispatch

### 8.1 React Controlled Inputs Not Updating State on Synthetic `value = 'x'`
- **Edge Case:** In React 16+, setting `input.value = "John"` directly does not trigger React's internal `onChange` handler because React overrides the native setter.
- **Defensive Strategy:**
  1. Call the native prototype value setter before dispatching events:
     ```javascript
     const prototype = Object.getPrototypeOf(input);
     const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value') 
       || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
     nativeSetter.set.call(input, value);
     input.dispatchEvent(new Event('input', { bubbles: true }));
     input.dispatchEvent(new Event('change', { bubbles: true }));
     ```
  2. Also dispatch `focus` before and `blur` after value injection.

### 8.2 Custom Select Dropdowns (Div / Listbox-based)
- **Edge Case:** Modern web apps replace native `<select>` with custom dropdowns (`role="combobox"`, `role="listbox"`, `div`-based menus).
- **Defensive Strategy:**
  1. Scanner detects elements with `role="combobox"` or `aria-haspopup="listbox"`.
  2. Two-step action: Step 1 clicks the combobox to open the menu; Step 2 re-scans the newly opened option elements to select the desired choice.

---

## 9. Summary Matrix of Error Recovery Policies

| Scenario | Severity | Fallback / Recovery Policy |
|---|---|---|
| Readability extraction fails | Low | Fallback to full `document.body.innerText` stripped of script/style tags |
| YouTube captions absent | Low | Fallback to video description, chapter titles, and metadata |
| Target element vanished | Medium | Inform user with friendly re-scan prompt; clear stale overlay |
| Password / CVV input | Critical | Hard block automated actions; advise manual entry |
| Banking / Checkout domain | Critical | Disable agent execution; enable read-only summary/chat |
| Gemini API 429 Rate Limit | Medium | Exponential backoff (up to 3 retries); notify user with countdown |
| Tab switched mid-task | Medium | Block action on wrong tab; prompt user to switch back |
| User clicks "Stop" | Normal | Immediately halt execution, remove all overlays, log abort in audit log |
