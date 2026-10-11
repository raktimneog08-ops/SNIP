# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-10

### Added
- **Chrome Manifest V3 Extension Foundation:** Complete side-panel architecture using the Chrome Side Panel API (`chrome.sidePanel`) and background service worker.
- **Mozilla Readability.js Integration:** Zero-dependency standalone article extractor stripping navigation, ads, footers, and noise.
- **Article Summarizer:** Generates structured Markdown summaries featuring **One-Line TL;DR**, **5 Key Points**, and **What To Do Next / Actionable Takeaways**.
- **Public YouTube Video Summarizer:** Reads title, channel, description, and available caption cues to generate chapter notes with **interactive clickable timestamp links** that seek video playback in real time.
- **Bilingual English & Hinglish Support:** Dynamic prompt system switching between analytical English and natural conversational Hinglish.
- **Context-Grounded Page Chat:** Conversational assistant strictly anchored to active page content with anti-hallucination guard and real-time streaming tokens.
- **Right-Click Context Menus:** Native Chrome context menus for *Explain this selection*, *Translate*, and *Draft a reply* routed to the side panel.
- **Multimodal Screen Vision:** Tab screenshot capture via `chrome.tabs.captureVisibleTab` and visual reasoning powered by Gemini Vision.
- **Interactive Element Scanner & Numbered Action Map:** Traverses the DOM to index buttons, links, inputs, selects, and textareas, overlaying non-intrusive floating badges `[1]`, `[2]`, ... `[N]`.
- **Human-In-The-Loop Browser Agent:** Proposes single atomic browser actions with explicit **[Approve & Execute]**, **[Skip]**, and **[Stop]** controls.
- **Synthetic Action Executor:** Safely simulates clicks, typed inputs (with React 16+ prototype setter compatibility), and dropdown selections.
- **Local Profile Management & Form Autofill:** Secure local storage (`chrome.storage.local`) for personal profile data and heuristic form matching.
- **One-Click Saved Skills Library:** Shortcuts for Action Item Extraction, ELI5, Table Data Extraction, and custom prompt templates.
- **Defense-In-Depth Safety Shield:** Complete protection blocking sensitive banking domains, passwords, credit cards, CVVs, and OTPs.
- **Auto-Healing Tab Bridge:** Automatic content script re-injection via `chrome.scripting` when extensions are reloaded.
- **Self-Healing Model Fallback:** Automatic model fallback from retired 1.5 endpoints to active `gemini-2.5-flash` / `gemini-2.0-flash`.
- **Automated Unit Test Suite:** 17 unit tests verified using Node.js native test runner (`node --test`).
- **Release Packaging Script:** One-command packager producing release ZIP in `dist/`.
