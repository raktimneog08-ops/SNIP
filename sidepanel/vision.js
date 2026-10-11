/**
 * sidepanel/vision.js
 * Screen Vision controller for capturing active tab and visual Q&A.
 */

import { ErrorHandler } from './error-handler.js';

export class VisionController {
  constructor(geminiClient) {
    this.gemini = geminiClient;
    this.previewContainer = document.getElementById('vision-preview-container');
    this.previewImg = document.getElementById('vision-preview-img');
    this.questionInput = document.getElementById('vision-question-input');
    this.askBtn = document.getElementById('btn-ask-vision');
    this.captureBtn = document.getElementById('btn-capture-screen');
    this.outputContainer = document.getElementById('vision-output');

    this.currentDataUrl = null;
  }

  init() {
    this.captureBtn.addEventListener('click', () => this.captureScreen());
    this.askBtn.addEventListener('click', () => this.askVision());
    this.questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.askVision();
      }
    });
  }

  async captureScreen() {
    try {
      this.outputContainer.innerHTML = `<p class="text-muted" style="text-align: center;">Capturing visible screen...</p>`;
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN' }, resolve);
      });

      if (!response || response.error || !response.dataUrl) {
        throw new Error(response ? response.error : 'Could not capture tab. Chrome prevents screenshotting internal pages.');
      }

      this.currentDataUrl = response.dataUrl;
      this.previewImg.src = this.currentDataUrl;
      this.previewContainer.style.display = 'block';
      this.askBtn.style.display = 'block';

      this.outputContainer.innerHTML = `<p class="text-muted" style="text-align: center;">Screenshot captured! Enter your question above and click <strong>Ask Gemini Vision</strong>.</p>`;
      ErrorHandler.showSuccess('Screen captured!');
    } catch (err) {
      ErrorHandler.showError(err);
      this.outputContainer.innerHTML = `<span style="color: var(--danger);">Error: ${err.message}</span>`;
    }
  }

  async askVision() {
    if (!this.currentDataUrl) {
      ErrorHandler.showWarning('Please capture a screen first.');
      return;
    }

    const question = this.questionInput.value.trim() || 'Describe what you see on this screen and answer any visible questions.';

    try {
      this.askBtn.disabled = true;
      this.outputContainer.innerHTML = `<p class="text-muted" style="text-align: center;">Analyzing image with Gemini Vision...</p>`;
      let fullResponse = '';

      await this.gemini.askVision(this.currentDataUrl, question, (chunk, isDone) => {
        fullResponse += chunk;
        this.outputContainer.innerHTML = fullResponse.replace(/\n/g, '<br>');
        if (isDone) {
          this.askBtn.disabled = false;
          ErrorHandler.showSuccess('Vision analysis complete!');
        }
      });
    } catch (err) {
      this.askBtn.disabled = false;
      this.outputContainer.innerHTML = `<span style="color: var(--danger);">Error: ${err.message}</span>`;
      ErrorHandler.showError(err);
    }
  }
}
