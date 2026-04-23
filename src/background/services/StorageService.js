/**
 * StorageService handles persistent data for leads, settings, and automation state.
 */
export class StorageService {
  constructor() {
    this.DEFAULT_KEYS = {
      leads: [],
      settings: {
        role: '',
        skills: '',
        template: '',
        userProfile: {}
      },
      stats: {
        totalScraped: 0,
        totalApplied: 0
      }
    };
  }

  async getLeads() {
    const data = await chrome.storage.local.get(['leads']);
    return data.leads || [];
  }

  async saveLead(lead) {
    const leads = await this.getLeads();
    const existingIndex = leads.findIndex(l => l.email === lead.email);
    
    const leadToSave = {
      ...lead,
      id: lead.id || btoa(lead.email + Date.now()).substring(0, 10),
      status: lead.status || 'new',
      createdAt: lead.createdAt || new Date().toISOString(),
      lastModifiedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      leads[existingIndex] = { ...leads[existingIndex], ...leadToSave };
    } else {
      leads.push(leadToSave);
    }

    await chrome.storage.local.set({ leads });
    return leadToSave;
  }

  async updateLeadStatus(leadId, status) {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = status;
      lead.lastModifiedAt = new Date().toISOString();
      await chrome.storage.local.set({ leads });
    }
  }

  async getSettings() {
    const data = await chrome.storage.local.get(['settings']);
    return data.settings || this.DEFAULT_KEYS.settings;
  }

  async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  }

  async clearAll() {
    await chrome.storage.local.set(this.DEFAULT_KEYS);
  }
}
