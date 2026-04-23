document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const saveBtn = document.getElementById('save-settings');
  const startBtn = document.getElementById('start-search');
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
  chrome.storage.local.get(['role', 'skills', 'template', 'leads', 'isScraping'], (data) => {
    if (data.role) document.getElementById('role').value = data.role;
    if (data.skills) document.getElementById('skills').value = data.skills;
    if (data.template) document.getElementById('template').value = data.template;
    
    if (data.isScraping) {
      setScrapingUI(true);
    }

    if (data.leads) {
      renderResults(data.leads);
      foundCount.textContent = data.leads.length;
    }
  });

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const role = document.getElementById('role').value;
    const skills = document.getElementById('skills').value;
    const template = document.getElementById('template').value;

    chrome.storage.local.set({ role, skills, template }, () => {
      saveBtn.textContent = 'Saved!';
      setTimeout(() => saveBtn.textContent = 'Save Configuration', 2000);
    });
  });

  // Start Scraping
  startBtn.addEventListener('click', () => {
    const role = document.getElementById('role').value;
    const skills = document.getElementById('skills').value;

    if (!role) {
      alert('Please enter a role.');
      return;
    }

    setScrapingUI(true);
    chrome.runtime.sendMessage({ action: 'startScraping', role, skills });
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
      startBtn.disabled = true;
      startBtn.textContent = 'Scraping...';
    } else {
      progressBar.classList.add('hidden');
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
      tr.innerHTML = `
        <td>${lead.company || 'Direct'}</td>
        <td>${lead.title || 'Lead'}</td>
        <td style="word-break: break-all;">${lead.email}</td>
        <td><button class="action-btn" data-index="${index}">Email</button></td>
      `;
      tr.querySelector('.action-btn').addEventListener('click', () => handleEmail(lead));
      resultsTable.appendChild(tr);
    });
  }

  async function handleEmail(lead) {
    const data = await chrome.storage.local.get(['template']);
    let body = data.template || '';
    body = body.replace(/{job_title}/g, lead.title || 'Role');
    body = body.replace(/{company}/g, lead.company || 'Company');
    const subject = `Application for ${lead.title || 'Job'}`;
    
    chrome.runtime.sendMessage({
      action: 'sendEmail',
      email: lead.email,
      subject: subject,
      body: body
    });
  }
});
