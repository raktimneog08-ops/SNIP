/**
 * content/youtube.js
 * YouTube video detector, metadata extractor, and interactive timestamp player controller.
 */

(function(global) {
  'use strict';

  class YouTubeController {
    static isYouTubeWatchPage() {
      return (
        window.location.hostname.includes('youtube.com') &&
        (window.location.pathname.startsWith('/watch') || window.location.pathname.startsWith('/shorts'))
      );
    }

    static getVideoId() {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('v')) return urlParams.get('v');

      const parts = window.location.pathname.split('/');
      if (parts[1] === 'shorts' && parts[2]) return parts[2];
      return '';
    }

    static getVideoData() {
      if (!this.isYouTubeWatchPage()) {
        return { isYouTube: false };
      }

      const videoId = this.getVideoId();
      const titleEl = document.querySelector('h1.ytd-watch-metadata, #title h1, h1.title');
      const title = titleEl ? titleEl.textContent.trim() : document.title.replace(' - YouTube', '');

      const channelEl = document.querySelector('#owner #channel-name a, ytd-channel-name a');
      const author = channelEl ? channelEl.textContent.trim() : '';

      const descEl = document.querySelector('#description-inline-expander, ytd-text-inline-expander, #description');
      const description = descEl ? descEl.textContent.trim() : '';

      const videoEl = document.querySelector('video.html5-main-video, video');
      const currentTime = videoEl ? Math.floor(videoEl.currentTime) : 0;
      const duration = videoEl ? Math.floor(videoEl.duration) : 0;

      // Extract any visible transcript cues or timed text if the transcript panel is open
      const transcriptCues = [];
      const cueElements = document.querySelectorAll('ytd-transcript-segment-renderer');
      cueElements.forEach(cue => {
        const timeNode = cue.querySelector('.segment-timestamp');
        const textNode = cue.querySelector('.segment-text');
        if (timeNode && textNode) {
          transcriptCues.push(`[${timeNode.textContent.trim()}] ${textNode.textContent.trim()}`);
        }
      });

      return {
        isYouTube: true,
        videoId,
        title,
        author,
        description,
        currentTime,
        duration,
        transcriptText: transcriptCues.length > 0 ? transcriptCues.join('\n') : description
      };
    }

    static seekTo(seconds) {
      const videoEl = document.querySelector('video.html5-main-video, video');
      if (!videoEl) {
        throw new Error('YouTube HTML5 video player not found on page.');
      }

      videoEl.currentTime = Number(seconds);
      videoEl.play().catch(() => {
        // Autoplay may be restricted if user hasn't interacted
      });

      return {
        success: true,
        currentTime: videoEl.currentTime
      };
    }
  }

  global.SnipYouTube = YouTubeController;
})(typeof window !== 'undefined' ? window : globalThis);
