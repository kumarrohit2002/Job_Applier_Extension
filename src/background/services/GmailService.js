/**
 * Simplified GmailService that uses the URL-based approach.
 * No OAuth2 Client ID required.
 */
export class GmailService {
  /**
   * Opens a new Gmail tab with the email pre-filled.
   */
  async createDraft(to, subject, body) {
    try {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      await chrome.tabs.create({ url: gmailUrl, active: true });
      
      return { success: true, method: 'url_redirection' };
    } catch (error) {
      console.error('[GmailService] Failed to open Gmail:', error);
      throw error;
    }
  }

  // Identity methods removed as they are no longer needed
}
