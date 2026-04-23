import { AIService } from './services/AIService.js';
import { StorageService } from './services/StorageService.js';
import { StateService } from './services/StateService.js';
import { GmailService } from './services/GmailService.js';

const aiService = new AIService();
const storageService = new StorageService();
const stateService = new StateService();
const gmailService = new GmailService();

// Initialize Services
chrome.runtime.onInstalled.addListener(() => {
  storageService.clearAll();
  console.log('🚀 [Job Applier PRO] System Initialized');
});

// Handle incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Use async/await inside message listener
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  try {
    switch (message.action) {
      case 'startScraping':
        return await startScrapingAction(message.role, message.skills);

      case 'stopScraping':
        return await stateService.stopSession();

      case 'newLeadsFound':
        return await processLeads(message.leads);

      case 'sendEmail':
        return await gmailService.createDraft(message.email, message.subject, message.body);

      case 'getSystemState':
        return await stateService.getState();

      case 'getLeads':
        return await storageService.getLeads();

      case 'incrementScroll':
        await stateService.incrementScroll();
        return { success: true };

      case 'scrapingFinished':
        await stateService.stopSession();
        chrome.runtime.sendMessage({ action: 'scrapingFinished' }).catch(() => {});
        return { success: true };

      case 'liveStatus':
        chrome.runtime.sendMessage({ action: 'liveStatus', status: message.status }).catch(() => {});
        return { success: true };

      default:
        return { error: 'Unknown action: ' + message.action };
    }
  } catch (error) {
    console.error('[Background] Error handling message:', error);
    return { error: error.message };
  }
}

async function startScrapingAction(role, skills) {
  const query = encodeURIComponent(`${role} ${skills}`);
  const url = `https://www.linkedin.com/search/results/content/?keywords=${query}&origin=FACETED_SEARCH&datePosted=%5B%22past-week%22%5D`;
  
  // Get the current active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (activeTab) {
    await chrome.tabs.update(activeTab.id, { url });
    await stateService.startSession(activeTab.id, role, skills);
    return { success: true, tabId: activeTab.id };
  } else {
    // Fallback if no active tab is found
    const tab = await chrome.tabs.create({ url, active: true });
    await stateService.startSession(tab.id, role, skills);
    return { success: true, tabId: tab.id };
  }
}

async function processLeads(leads) {
  const settings = await storageService.getSettings();
  const processedLeads = [];

  for (const rawLead of leads) {
    // 1. Force Save Immediately (No AI yet)
    const initialLead = await storageService.saveLead({
      ...rawLead,
      personalizedBody: settings.template.replace(/{job_title}/g, rawLead.title).replace(/{company}/g, rawLead.company)
    });

    processedLeads.push(initialLead);

    // Broadcast update to popup immediately
    chrome.runtime.sendMessage({ action: 'leadsUpdate', leads: await storageService.getLeads() }).catch(() => {});

    // 2. AI Enrichment (Background Process)
    aiService.generatePersonalizedEmail(
      settings.template, 
      rawLead, 
      settings.userProfile
    ).then(async (betterBody) => {
      const updatedLead = await storageService.saveLead({
        ...initialLead,
        id: initialLead.id,
        personalizedBody: betterBody
      });
      // Broadcast updated AI body
      chrome.runtime.sendMessage({ action: 'leadsUpdate', leads: await storageService.getLeads() }).catch(() => {});
    }).catch(e => console.warn('[Background] AI Personalization failed, but lead was saved.'));
  }

  return { success: true, count: processedLeads.length };
}

// Keep search page alive and detect closure
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await stateService.getState();
  if (state.activeTabId === tabId) {
    console.log('⚠️ [Job Applier PRO] Automation tab closed. Finishing session.');
    await stateService.stopSession();
  }
});
