/**
 * StorageService handles persistent data for leads, settings, and automation state.
 */
export class StorageService {
  constructor() {
    this.DEFAULT_KEYS = {
      leads: [],
      settings: {
        role: 'Full Stack Developer',
        skills: 'MERN Stack',
        template: `Subject: Application for {job_title} - Rohit Kumar

Dear Hiring Team at {company},

I am Rohit Kumar, a Full Stack Developer with significant experience in building scalable web applications using Next.js and the MERN stack. I noticed the {job_title} opening at {company} and believe my technical background makes me a strong candidate.

My Expertise:
• Frontend: Next.js, React.js, TypeScript, Tailwind CSS
• Backend: Node.js, Express.js, PostgreSQL, MongoDB
• Key Projects: Built 'Tastico' (culinary platform) and 'PGHunter.in' (student accommodation) with secure auth and payment integration.
• Experience: Currently interning at VisionTech Group, optimizing EMS and official websites.

I am a quick learner and a hard worker who thrives in fast-paced environments. I look forward to the possibility of discussing how I can contribute to {company}.

Best regards,
Rohit Kumar
Email: rohitranjanrrsingh@gmail.com
LinkedIn: linkedin.com/in/rohit-full-stack-dev
GitHub: github.com/kumarrohit2002
Mobile: +91-7903769260`,
        userProfile: {
          name: 'Rohit Kumar',
          email: 'rohitranjanrrsingh@gmail.com',
          phone: '+91-7903769260',
          linkedin: 'https://www.linkedin.com/in/rohit-full-stack-dev',
          github: 'https://github.com/kumarrohit2002'
        }
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
