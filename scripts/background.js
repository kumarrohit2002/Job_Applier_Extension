chrome.runtime.onInstalled.addListener(() => {
  const defaultTemplate = `Dear Hiring Team at {company},

I am Rohit Kumar, a Full Stack Developer with hands-on experience in building scalable web applications using Next.js and the MERN stack. I am excited to apply for the {job_title} role at {company}.

Currently, I am working as a Full Stack Developer Intern at VisionTech Group, where I have been contributing to real-world projects like an Employee Management System, company website optimization, and platform enhancements using Next.js, React.js, Node.js, and MongoDB.

I have also built impactful projects such as:

• Tastico – A full-stack service marketplace with role-based dashboards, Razorpay integration, and secure authentication.
• PGHunter.in – A student accommodation platform with booking workflows and secure backend APIs.
• UR-SARTHI – A mentorship platform with video calls, chat, and payment integration.

Technical Skills:
• Frontend: Next.js, React.js, TypeScript, Tailwind CSS
• Backend: Node.js, Express.js
• Database: PostgreSQL, MongoDB

I am passionate about building real-world products, learning quickly, and solving problems efficiently. I would love the opportunity to contribute and grow with {company}.

Best regards,
Rohit Kumar

LinkedIn: https://www.linkedin.com/in/rohit-full-stack-dev
GitHub: https://github.com/kumarrohit2002
Email: rohitranjanrrsingh@gmail.com
Mobile: +91-7903769260`;

  chrome.storage.local.get(['role', 'template'], (data) => {
    if (!data.role || !data.template) {
      chrome.storage.local.set({
        role: 'Full Stack Developer',
        skills: 'software engineer',
        template: defaultTemplate
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    const { role, skills, timeFilter } = message;
    const enhancedSkills = skills.toLowerCase().includes('hire') ? skills : `${skills} hire`;
    const query = encodeURIComponent(`${role} ${enhancedSkills}`);
    
    let dateParam = '';
    if (timeFilter === 'past-24h') dateParam = '&datePosted=%5B%22past-24h%22%5D';
    else if (timeFilter === 'past-week') dateParam = '&datePosted=%5B%22past-week%22%5D';
    else if (timeFilter === 'past-month') dateParam = '&datePosted=%5B%22past-month%22%5D';

    const url = `https://www.linkedin.com/search/results/content/?keywords=${query}&origin=FACETED_SEARCH${dateParam}`;
    
    chrome.storage.local.set({ isScraping: true, currentRole: role });
    chrome.tabs.create({ url, active: true });
    sendResponse({ success: true });
  }

  if (message.action === 'analyzePost') {
    chrome.storage.local.get(['geminiKey', 'useAI'], async (data) => {
      if (!data.useAI || !data.geminiKey) {
        sendResponse({ error: 'AI not enabled or key missing' });
        return;
      }

      try {
        const result = await callGeminiFlash(data.geminiKey, message.text);
        sendResponse({ analysis: result });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });
    return true; // Keep channel open
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

async function callGeminiFlash(apiKey, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `Analyze this LinkedIn job post and extract information in JSON format.
  Post text: "${text}"
  
  Return ONLY a JSON object with:
  {
    "company": "Company Name",
    "title": "Job Title",
    "skills": ["Skill 1", "Skill 2"],
    "isJobPost": true/false
  }
  If you cannot find a company or title, guess based on context.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gemini API Error');
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  
  // Clean potential markdown code blocks from response
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Invalid AI response format');
}
