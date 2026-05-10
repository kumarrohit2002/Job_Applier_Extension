document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const saveBtn = document.getElementById('save-settings');
  const startBtn = document.getElementById('start-search');
  const stopBtn = document.getElementById('stop-search');
  const clearBtn = document.getElementById('clear-leads');
  const resultsTable = document.querySelector('#results-table tbody');
  const noResults = document.getElementById('no-results');
  const foundCount = document.getElementById('found-count');
  const progressBar = document.getElementById('scraping-progress');

  // Tab Logic
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Load Settings
  chrome.storage.local.get(['role', 'skills', 'template', 'leads', 'isScraping', 'geminiKey', 'useAI', 'timeFilter', 'cvLink'], (data) => {
    if (data.role) document.getElementById('role').value = data.role;
    if (data.skills) document.getElementById('skills').value = data.skills;
    if (data.template) document.getElementById('template').value = data.template;
    if (data.geminiKey) document.getElementById('gemini-key').value = data.geminiKey;
    if (data.useAI) document.getElementById('use-ai').checked = data.useAI;
    if (data.timeFilter) document.getElementById('time-filter').value = data.timeFilter;
    if (data.cvLink) {
      document.getElementById('cv-link').value = data.cvLink;
      document.getElementById('open-cv').href = data.cvLink;
    }
    
    toggleGeminiSettings(data.useAI);

    if (data.isScraping) {
      setScrapingUI(true);
    }

    if (data.leads) {
      renderResults(data.leads);
      foundCount.textContent = data.leads.length;
    }
  });

  document.getElementById('cv-link').addEventListener('input', (e) => {
    document.getElementById('open-cv').href = e.target.value || '#';
  });

  document.getElementById('use-ai').addEventListener('change', (e) => {
    toggleGeminiSettings(e.target.checked);
  });

  function toggleGeminiSettings(show) {
    const settings = document.getElementById('gemini-settings');
    if (show) {
      settings.classList.remove('hidden');
    } else {
      settings.classList.add('hidden');
    }
  }

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const role = document.getElementById('role').value;
    const skills = document.getElementById('skills').value;
    const template = document.getElementById('template').value;
    const geminiKey = document.getElementById('gemini-key').value;
    const useAI = document.getElementById('use-ai').checked;
    const timeFilter = document.getElementById('time-filter').value;
    const cvLink = document.getElementById('cv-link').value;

    chrome.storage.local.set({ role, skills, template, geminiKey, useAI, timeFilter, cvLink }, () => {
      saveBtn.textContent = 'Saved!';
      setTimeout(() => saveBtn.textContent = 'Save Configuration', 2000);
      document.getElementById('open-cv').href = cvLink || '#';
    });
  });

  // Start Scraping
  startBtn.addEventListener('click', () => {
    const role = document.getElementById('role').value;
    const skills = document.getElementById('skills').value;
    const timeFilter = document.getElementById('time-filter').value;

    if (!role) {
      alert('Please enter a role.');
      return;
    }

    setScrapingUI(true);
    chrome.runtime.sendMessage({ action: 'startScraping', role, skills, timeFilter });
  });

  // Stop Scraping
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopScraping' });
    setScrapingUI(false);
  });

  // Clear Leads
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all results?')) {
      chrome.storage.local.set({ leads: [] }, () => {
        renderResults([]);
        foundCount.textContent = '0';
      });
    }
  });

  function setScrapingUI(isScraping) {
    if (isScraping) {
      progressBar.classList.remove('hidden');
      stopBtn.classList.remove('hidden');
      startBtn.disabled = true;
      startBtn.textContent = 'Scraping...';
    } else {
      progressBar.classList.add('hidden');
      stopBtn.classList.add('hidden');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Search & Scrape';
    }
  }

  // Listen for updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'leadsUpdate') {
      renderResults(message.leads);
      foundCount.textContent = message.leads.length;
    } else if (message.action === 'scrapingFinished') {
      setScrapingUI(false);
    }
  });

  function renderResults(leads) {
    resultsTable.innerHTML = '';
    if (!leads || leads.length === 0) {
      noResults.style.display = 'block';
      return;
    }

    noResults.style.display = 'none';
    leads.forEach((lead, index) => {
      const tr = document.createElement('tr');
      const isSent = lead.status === 'applied';
      
      tr.innerHTML = `
        <td style="text-align: center; color: var(--primary); font-weight: bold;">${index + 1}</td>
        <td>${lead.company || 'Direct'}</td>
        <td>${lead.title || 'Lead'}</td>
        <td style="word-break: break-all;">${lead.email}</td>
        <td>
          <button class="action-btn ${isSent ? 'sent' : ''}" data-index="${index}">
            ${isSent ? 'Already Sent' : 'Send Email'}
          </button>
        </td>
      `;
      
      const btn = tr.querySelector('.action-btn');
      if (!isSent) {
        btn.addEventListener('click', () => handleEmail(lead, index));
      }
      resultsTable.appendChild(tr);
    });
  }

  async function handleEmail(lead, index) {
    const data = await chrome.storage.local.get(['template', 'cvLink', 'leads']);
    let body = data.template || '';
    let cvLink = (data.cvLink || '').trim();
    let leads = data.leads || [];
    
    if (!cvLink) {
      alert('⚠️ Please add your CV/Resume link in the Setup tab first!');
      // Switch to setup tab
      document.querySelector('[data-tab="setup"]').click();
      return;
    }
    
    // Ensure cvLink is a clickable URL
    if (cvLink && !cvLink.startsWith('http')) {
      cvLink = 'https://' + cvLink;
    }
    
    body = body.replace(/{job_title}/g, lead.title || 'Role');
    body = body.replace(/{company}/g, lead.company || 'Company');
    
    if (body.includes('{cv_link}')) {
      body = body.replace(/{cv_link}/g, cvLink);
    } else if (cvLink) {
      body += `\n\nMy Resume: ${cvLink}`;
    }

    const subject = `Application for ${lead.title || 'Job'}`;
    
    // Update lead status
    leads[index].status = 'applied';
    chrome.storage.local.set({ leads }, () => {
      renderResults(leads);
    });

    chrome.runtime.sendMessage({
      action: 'sendEmail',
      email: lead.email,
      subject: subject,
      body: body
    });
  }
});
