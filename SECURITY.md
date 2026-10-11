# Security Policy

## 🔒 Security Philosophy & Design

Security is a foundational tenet of **Snip**. Because Snip is a browser agent capable of interacting with web pages, multiple layers of defense-in-depth are enforced:

1. **Guaranteed Human-In-The-Loop:**
   - Snip **never** clicks, types, or submits forms autonomously in the background.
   - Every single browser action must be explicitly reviewed and clicked (**Approve & Execute**) by the user.

2. **Sensitive Fields Hard-Block:**
   - Any input marked `type="password"`, `autocomplete="cc-number"`, `autocomplete="cc-csc"`, `cvv`, `ssn`, `otp`, or labeled with credential keywords is blocked from automated action execution.

3. **Restricted Domain Blacklist:**
   - Internal Chrome URLs (`chrome://*`, `chrome-extension://*`) are strictly blocked.
   - Banking portals and payment processors (`*banking*`, `*chase.com*`, `*stripe.com*`, `*paypal.com*`) are put into Read-Only Safety Mode.

4. **Zero Remote Telemetry & Local Storage:**
   - API keys and user profile data are saved strictly inside your local browser via `chrome.storage.local`.
   - Snip contains zero external trackers or telemetry servers. All requests go directly to the official Google Gemini API endpoint.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability or bypass in Snip, please report it responsibly:

- **Do NOT** open a public GitHub issue.
- Please email the maintainers or report via GitHub Security Advisories.
- Include a detailed description of the vulnerability, reproduction steps, and potential impact.
- We will acknowledge receipt within 48 hours and work with you on a coordinated disclosure.
