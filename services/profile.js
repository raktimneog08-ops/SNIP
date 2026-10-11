/**
 * services/profile.js
 * User Profile Management & Form Autofill Heuristic Matcher.
 */

import { StorageService } from './storage.js';

export const ProfileService = {
  FIELD_MATCHERS: {
    fullName: [
      /full[-_ ]?name/i, /^name$/i, /your[-_ ]?name/i, /first[-_ ]?name/i, /fname/i, /contact[-_ ]?name/i
    ],
    email: [
      /email/i, /e-mail/i, /mail[-_ ]?address/i, /user[-_ ]?email/i
    ],
    phone: [
      /phone/i, /telephone/i, /mobile/i, /cell/i, /contact[-_ ]?number/i, /tel$/i
    ],
    addressLine1: [
      /address/i, /street/i, /addr1/i, /address[-_ ]?line[-_ ]?1/i, /location/i
    ],
    city: [
      /^city$/i, /town/i, /city[-_ ]?name/i
    ],
    state: [
      /^state$/i, /province/i, /region/i, /state[-_ ]?province/i
    ],
    zipCode: [
      /zip/i, /postal/i, /post[-_ ]?code/i, /pincode/i
    ],
    country: [
      /country/i, /nation/i
    ],
    jobTitle: [
      /job[-_ ]?title/i, /designation/i, /role/i, /position/i, /occupation/i
    ],
    company: [
      /company/i, /organization/i, /employer/i, /business/i
    ],
    bio: [
      /bio/i, /about[-_ ]?me/i, /summary/i, /description/i, /introduction/i
    ]
  },

  async getProfile() {
    return await StorageService.getUserProfile();
  },

  async saveProfile(profile) {
    return await StorageService.saveUserProfile(profile);
  },

  /**
   * Matches an individual form element against profile fields.
   * @param {Object} el - { id, tag, type, name, placeholder, label }
   * @param {Object} profile - User profile data object
   */
  matchElementToProfile(el, profile) {
    if (!el || el.tag !== 'INPUT' && el.tag !== 'TEXTAREA') {
      return null;
    }

    if (el.isSensitive || el.type === 'password' || el.type === 'hidden' || el.type === 'submit') {
      return null;
    }

    // Direct input type check
    if (el.type === 'email' && profile.email) {
      return { key: 'email', value: profile.email, confidence: 1.0 };
    }
    if (el.type === 'tel' && profile.phone) {
      return { key: 'phone', value: profile.phone, confidence: 1.0 };
    }

    const identifiers = [
      el.name || '',
      el.placeholder || '',
      el.label || '',
      el.idStr || ''
    ].join(' ');

    for (const [profileKey, patterns] of Object.entries(this.FIELD_MATCHERS)) {
      const val = profile[profileKey];
      if (!val) continue;

      for (const pattern of patterns) {
        if (pattern.test(identifiers)) {
          return { key: profileKey, value: val, confidence: 0.9 };
        }
      }
    }

    return null;
  },

  /**
   * Proposes a sequence of single autofill actions for all matching form fields.
   * @param {Array} elements - Scanned ActionElement list
   * @param {Object} profile - User profile object
   */
  proposeAutofillPlan(elements, profile) {
    const proposals = [];

    for (const el of elements) {
      const match = this.matchElementToProfile(el, profile);
      if (match) {
        proposals.push({
          action: 'TYPE',
          elementId: el.id,
          targetLabel: el.label || el.name || el.placeholder || `Element #${el.id}`,
          matchedKey: match.key,
          value: match.value,
          rationale: `Autofill ${match.key} from saved local profile into ${el.label || el.name || 'field'}`
        });
      }
    }

    return proposals;
  }
};
