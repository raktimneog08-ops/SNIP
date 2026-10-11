# Snip: Chrome Side-Panel AI Agent - Problem Statement

## 1. Project Overview
Build **Snip**, a Chrome side-panel AI agent that can understand the page currently open in the browser and help the user act on it safely.

Snip should be able to:
- Summarise articles and public YouTube videos in English or Hinglish.
- Chat with the current web page and answer only from the page context.
- Explain, translate, or draft replies from selected page content.
- Read visible screen content through screenshot-based questions.
- Detect interactive elements such as buttons, links, inputs, dropdowns, and checkboxes.
- Turn those elements into a numbered action map that an AI model can reason about.
- Execute browser actions only after the user approves each step.
- Remember a local user profile and reuse it for forms, drafts, and saved one-click skills.
- Apply safety rules that prevent risky actions on sensitive pages or fields.
- Run locally as a Chrome extension using free-tier tools wherever possible.

The project must be completed in **4 weeks** and should result in a safe, installable Chrome extension that can be shared through a public GitHub release.

## 2. Problem Statement
Most AI assistants can explain information, but they are separated from the browser context where users actually work. Users still need to copy text into a chatbot, explain what page they are viewing, identify which field or button matters, and manually carry out every browser step.

More capable browser agents can automate these tasks, but they may be paid, unavailable to some users, or too autonomous for actions that involve personal information or consequential clicks.

The goal of Snip is to create a **user-controlled browser agent** that combines understanding and action while keeping the user in charge.

Snip must understand the current page, reason about visible and interactive content, propose one action at a time, and wait for explicit approval before acting. It must also include privacy and safety restrictions so it does not operate on sensitive pages or enter protected information.

## 3. Primary Goal
At the end of four weeks, a user should be able to open Snip in the Chrome side panel on a supported page and do the following:
1. Ask Snip to summarise the current article or a public YouTube link.
2. Switch the response language between English and Hinglish.
3. Ask follow-up questions about the page.
4. Use quick actions such as Explain, Translate, and Draft a reply.
5. Ask questions about visible non-text content using a screenshot.
6. Give Snip a browser task such as filling a practice form or finding information.
7. Review the next proposed action and choose **Approve**, **Skip**, or **Stop**.
8. Let Snip perform only the approved browser action.
9. See a log of the actions that were proposed and performed.
10. Reuse locally stored profile information and saved skills.

Snip is not intended to be a fully autonomous browser bot. It is an **agent the user controls**.

## 4. Target Platform and Core Stack

### Browser
- Google Chrome on desktop.
- Chrome Extension Manifest V3.
- Chrome Side Panel API.
- Chrome content scripts and `chrome.scripting` for page interaction.
- `chrome.tabs.captureVisibleTab` for screen capture.
- `chrome.contextMenus` for right-click actions.
- `chrome.storage.local` for local memory and preferences.

### Development Environment
- **Cursor** as the primary code editor and AI-assisted development environment.

### AI and Content Processing
- Gemini Flash-Lite as the default everyday model.
- Gemini Flash for harder image or reasoning tasks when needed.
- Groq free tier as a text-only fallback when appropriate.
- Gemini public YouTube link input for supported public YouTube content.
- Mozilla Readability.js for extracting readable article content.

### Distribution
- GitHub repository.
- GitHub Releases for an installable extension ZIP.
- GitHub Pages for a simple project landing page.

## 5. Four-phaseBuild Plan

### phase1 - The Eyes: Read the Web
**Objective:** Create the Chrome extension foundation and give Snip the ability to read and summarise web content.

**Required Features:**
1. **Chrome Extension Foundation:** Create a Manifest V3 Chrome extension containing the manifest, side-panel interface, background service worker, settings area for the user's Gemini API key, and ability to load the project through Chrome's **Load unpacked** flow.
2. **First AI Interaction:** The user should be able to select text on a page and ask Snip to explain it in plain language, with results displayed inside the side panel.
3. **Article Summarisation:** Use Readability.js to extract useful article content while excluding navigation, ads, footers, and page noise. Generate a structured summary containing:
   - One-line TL;DR.
   - Five key points.
   - What to do next.
4. **Public YouTube Summarisation:** For a supported public YouTube link, provide a structured summary including chapter-style notes with clickable timestamps. (Private/unsupported content out of scope).
5. **Language Toggle:** Switch output between English and Hinglish.

**phase1 Acceptance Criteria:**
- The extension loads successfully in Chrome.
- The side panel opens next to a normal webpage.
- API key can be entered through extension settings rather than hard-coded.
- Selected text can be explained by the AI.
- A normal article can be summarised into the required structure.
- A supported public YouTube link can be summarised.
- English/Hinglish switching works.
*(Optional Stretch Goal: On-device/offline article summarisation).*

### phase2 - The Brain: Understand the Page and the Screen
**Objective:** Turn the side panel into a context-aware assistant that can reason about the current page and visible screen content.

**Required Features:**
1. **Page Chat:** Add a chat interface using the current page as context:
   - Answer questions using page content.
   - Avoid inventing information not present on the page.
   - Clearly state when an answer is unavailable.
   - Keep conversation history for active interaction.
   - Stream responses into the side panel when supported.
2. **Right-Click AI Actions:** Add Chrome context-menu actions for selected text:
   - **Explain this** – simplify jargon or dense text.
   - **Translate** – translate into Hindi or another selected language.
   - **Draft a reply** – create a reply for content such as an email, LinkedIn post, or forum message.
   - All results should open in or be sent to the Snip side panel.