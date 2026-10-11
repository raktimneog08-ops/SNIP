/**
 * Mozilla Readability - Standalone Browser & Content Script Implementation
 * Extracts clean readable article content from complex web pages.
 */
(function(global) {
  'use strict';

  const REGEXPS = {
    unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup/i,
    okMaybeItsACandidate: /and|article|body|column|content|main|shadow|entry|post/i,
    positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
    negative: /hidden|^hid$| combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
    byline: /byline|author|dateline|writtenby|p-author/i
  };

  class Readability {
    constructor(doc, options = {}) {
      this._doc = doc;
      this._articleTitle = null;
      this._articleByline = null;
      this._maxElemsToParse = options.maxElemsToParse || 0;
      this._nbTopCandidates = options.nbTopCandidates || 5;
    }

    parse() {
      if (!this._doc || !this._doc.body) {
        return null;
      }

      // Clone document to avoid mutating the live page DOM
      const docClone = this._doc.cloneNode(true);
      this._cleanDocument(docClone);

      const title = this._getArticleTitle(docClone);
      const byline = this._getArticleByline(docClone);

      const articleNode = this._grabArticle(docClone);
      if (!articleNode) {
        // Fallback: extract sanitized text from body
        const bodyText = (this._doc.body.innerText || '').trim();
        return {
          title: title || this._doc.title || 'Web Page',
          byline: byline || '',
          content: `<div>${bodyText.slice(0, 15000)}</div>`,
          textContent: bodyText.slice(0, 30000),
          length: bodyText.length,
          excerpt: bodyText.slice(0, 200) + '...'
        };
      }

      const textContent = (articleNode.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        title: title || this._doc.title || 'Web Page',
        byline: byline || '',
        content: articleNode.innerHTML,
        textContent: textContent,
        length: textContent.length,
        excerpt: textContent.slice(0, 250) + (textContent.length > 250 ? '...' : '')
      };
    }

    _cleanDocument(doc) {
      const removeSelectors = [
        'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
        'nav', 'footer', 'header', 'aside', '.cookie-banner', '#gdpr',
        '[aria-hidden="true"]', '.ad', '.ads', '.advertisement', '.social-share'
      ];
      doc.querySelectorAll(removeSelectors.join(',')).forEach(el => el.remove());
    }

    _getArticleTitle(doc) {
      const h1 = doc.querySelector('h1');
      if (h1 && h1.textContent.trim().length > 5) {
        return h1.textContent.trim();
      }
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) {
        return ogTitle.content.trim();
      }
      return doc.title || '';
    }

    _getArticleByline(doc) {
      const bylineNode = doc.querySelector('[rel="author"], .author, .byline, [itemprop="author"]');
      if (bylineNode) {
        return bylineNode.textContent.trim();
      }
      const metaAuthor = doc.querySelector('meta[name="author"]');
      return metaAuthor ? metaAuthor.content.trim() : '';
    }

    _grabArticle(doc) {
      const elementsToScore = [];
      const paragraphs = doc.querySelectorAll('p, pre, article, section');

      paragraphs.forEach(node => {
        const text = node.textContent.trim();
        if (text.length < 25) return;

        const parentNode = node.parentElement;
        if (!parentNode) return;

        if (!parentNode._readabilityScore) {
          parentNode._readabilityScore = this._initializeNodeScore(parentNode);
          elementsToScore.push(parentNode);
        }

        // Add points based on paragraph content
        let contentScore = 1;
        contentScore += text.split(',').length;
        contentScore += Math.min(Math.floor(text.length / 100), 3);
        parentNode._readabilityScore += contentScore;
      });

      let topCandidate = null;
      elementsToScore.forEach(el => {
        el._readabilityScore = el._readabilityScore * (1 - this._getLinkDensity(el));
        if (!topCandidate || el._readabilityScore > topCandidate._readabilityScore) {
          topCandidate = el;
        }
      });

      if (!topCandidate || topCandidate._readabilityScore < 10) {
        return doc.querySelector('article, main, [role="main"]') || doc.body;
      }

      return topCandidate;
    }

    _initializeNodeScore(node) {
      let score = 0;
      switch (node.tagName) {
        case 'DIV': score += 5; break;
        case 'PRE':
        case 'TD':
        case 'BLOCKQUOTE': score += 3; break;
        case 'ADDRESS':
        case 'OL':
        case 'UL':
        case 'DL':
        case 'DD':
        case 'DT':
        case 'LI':
        case 'FORM': score -= 3; break;
        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
        case 'TH': score -= 5; break;
      }
      score += this._getClassWeight(node);
      return score;
    }

    _getClassWeight(node) {
      let weight = 0;
      if (node.className && typeof node.className === 'string') {
        if (REGEXPS.negative.test(node.className)) weight -= 25;
        if (REGEXPS.positive.test(node.className)) weight += 25;
      }
      if (node.id && typeof node.id === 'string') {
        if (REGEXPS.negative.test(node.id)) weight -= 25;
        if (REGEXPS.positive.test(node.id)) weight += 25;
      }
      return weight;
    }

    _getLinkDensity(element) {
      const textLength = element.textContent.trim().length;
      if (textLength === 0) return 0;

      let linkLength = 0;
      element.querySelectorAll('a').forEach(a => {
        linkLength += a.textContent.trim().length;
      });
      return linkLength / textLength;
    }
  }

  // Export to window / content script scope and commonjs / esm if applicable
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Readability };
  } else {
    global.Readability = Readability;
  }
})(typeof window !== 'undefined' ? window : globalThis);
