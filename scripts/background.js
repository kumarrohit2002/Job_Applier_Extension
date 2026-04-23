chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    const { role, skills } = message;
    const query = encodeURIComponent(`${role} ${skills}`);
    const url = `https://www.linkedin.com/search/results/content/?keywords=${query}&origin=FACETED_SEARCH&datePosted=%5B%22past-week%22%5D`;
    
    chrome.storage.local.set({ isScraping: true, currentRole: role });
    chrome.tabs.create({ url, active: true });
    sendResponse({ success: true });
  }

  if (message.action === 'sendEmail') {
    const { email, subject, body } = message;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    chrome.tabs.create({ url: gmailUrl, active: true });
    sendResponse({ success: true });
  }

  if (message.action === 'newLeadsFound') {
    chrome.storage.local.get(['leads'], (data) => {
      let leads = data.leads || [];
      const newLeads = message.leads.filter(nl => !leads.some(el => el.email === nl.email));
      
      if (newLeads.length > 0) {
        leads = [...leads, ...newLeads];
        chrome.storage.local.set({ leads }, () => {
          chrome.runtime.sendMessage({ action: 'leadsUpdate', leads }).catch(() => {});
        });
      }
    });
    sendResponse({ success: true });
  }

  if (message.action === 'scrapingFinished') {
    chrome.storage.local.set({ isScraping: false });
    chrome.runtime.sendMessage({ action: 'scrapingFinished' }).catch(() => {});
    sendResponse({ success: true });
  }

  return true; // Keep channel open
});
