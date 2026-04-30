chrome.runtime.onInstalled.addListener(() => {
  const defaultTemplate = `Subject: Application for {job_title} - Rohit Kumar

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
Mobile: +91-7903769260`;

  chrome.storage.local.get(['role', 'template'], (data) => {
    if (!data.role || !data.template) {
      chrome.storage.local.set({
        role: 'Full Stack Developer',
        skills: 'Next.js, MERN stack, React.js, Tailwind CSS',
        template: defaultTemplate
      });
    }
  });
});

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

  if (message.action === 'scrapingFinished' || message.action === 'stopScraping') {
    chrome.storage.local.set({ isScraping: false });
    chrome.runtime.sendMessage({ action: 'scrapingFinished' }).catch(() => {});
    sendResponse({ success: true });
  }

  return true; // Keep channel open
});
