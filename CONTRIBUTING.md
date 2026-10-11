# Contributing to Snip

Thank you for your interest in contributing to **Snip**! We welcome bug reports, feature suggestions, documentation improvements, and pull requests.

---

## 🛠️ Development Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/snip.git
   cd snip
   ```

2. **Zero Dependency Runtime:**
   Snip is built with native modern Web APIs and Node.js built-ins. You do not need to install heavy `node_modules` for running the extension in Chrome.

3. **Running the Automated Test Suite:**
   Snip uses the native Node.js test runner (`node --test`):
   ```bash
   npm test
   ```

4. **Regenerating Icons:**
   To regenerate high-resolution PNG icons from the pure Node.js generator:
   ```bash
   npm run generate-icons
   ```

5. **Building the Production ZIP:**
   ```bash
   npm run package
   ```

---

## 🌐 Loading Unpacked in Chrome

1. Open Google Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** (top left).
4. Select the `snip` root directory.
5. When making code changes to content scripts or the background service worker, click the **🔄 Reload** icon on the extension card in `chrome://extensions`.

---

## 📐 Architecture & Coding Guidelines

- **Manifest V3 Only:** Adhere strictly to Chrome MV3 guidelines. Service workers are stateless and short-lived.
- **Safety First:** Never remove or weaken sensitive field blockers (`type="password"`, CVV, credit cards, banking URLs in `services/safety.js`).
- **Human In The Loop:** The browser agent must always require explicit user approval (**Approve**, **Skip**, or **Stop**) for DOM actions.
- **Maintain Test Coverage:** Any new feature or heuristic must include corresponding unit tests in `tests/unit/`.

---

## 🔄 Pull Request Process

1. Fork the repository and create your feature branch from `master` (`git checkout -b feature/amazing-feature`).
2. Ensure all tests pass: `npm test`.
3. Commit your changes with clear, semantic commit messages (`git commit -m 'feat: add support for custom model endpoints'`).
4. Push to your branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request detailing the changes, motivation, and verification steps.
