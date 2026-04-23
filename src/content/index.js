/**
 * Job Applier PRO - The Ultimate Scraper (Final Version)
 * Self-starting, robust, and visual.
 */

class StealthService {
  async humanScroll() {
    const scrollDistance = 1200; 
    const startY = window.scrollY;
    let currentY = startY;
    
    while (currentY < startY + scrollDistance) {
      const step = Math.floor(Math.random() * 200) + 50;
      currentY += step;
      window.scrollBy({ top: step, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, Math.random() * 600 + 400));
      if (window.scrollY + window.innerHeight >= document.body.scrollHeight) break;
    }
  }

  async wait(ms) {
    const jitter = (Math.random() - 0.5) * (ms * 0.3);
    await new Promise(r => setTimeout(r, ms + jitter));
  }
}

const stealth = new StealthService();

// --- UI Components ---
function createStatusBubble() {
  let bubble = document.getElementById('job-applier-status');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'job-applier-status';
    Object.assign(bubble.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '12px 20px',
      background: 'rgba(10, 10, 30, 0.9)',
      color: '#00d2ff',
      borderRadius: '30px',
      border: '2px solid #00d2ff',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: '999999',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, sans-serif',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    });
    document.body.appendChild(bubble);
  }
  return bubble;
}

function updateStatus(text, type = 'working') {
  const bubble = createStatusBubble();
  const icon = type === 'working' ? '🤖' : '✅';
  bubble.innerHTML = `<span style="font-size: 18px">${icon}</span> <span>Job Applier PRO: ${text}</span>`;
  
  if (type === 'error') {
    bubble.style.borderColor = '#ff4d4d';
    bubble.style.color = '#ff4d4d';
  } else {
    bubble.style.borderColor = '#00d2ff';
    bubble.style.color = '#00d2ff';
  }
}

// --- Lifecycle ---
async function safeSendMessage(message) {
  try {
    if (!chrome.runtime?.id) return null;
    return await chrome.runtime.sendMessage(message);
  } catch (e) { return null; }
}

(async function init() {
  console.log('🚀 [Job Applier PRO] Engine Start Detected');
  
  // Robust URL check
  if (!window.location.href.includes('linkedin.com/search/results/content')) return;

  // Wait for results with better selectors
  let attempts = 0;
  while (attempts < 15) {
    const results = document.querySelector('.reusable-search__result-container, .feed-shared-update-v2, .search-results-container');
    if (results) break;
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  const response = await safeSendMessage({ action: 'getSystemState' });
  if (response && response.isScraping) {
    console.log('🎯 [Job Applier PRO] Automation Active. Initiating Wave 1.');
    runAutomationSession();
  }
})();

async function runAutomationSession() {
  const MAX_SCROLLS = 10;
  let currentScrolls = 0;

  try {
    await safeSendMessage({ action: 'liveStatus', status: 'Initializing Machine...' });
    
    while (currentScrolls < MAX_SCROLLS) {
      const progress = `${currentScrolls + 1}/${MAX_SCROLLS}`;
      
      await safeSendMessage({ action: 'liveStatus', status: `Wave ${progress} - Expanding...` });
      updateStatus(`Wave ${progress} - Expanding...`);
      await expandAllPosts();
      await stealth.wait(1500); 
      
      await safeSendMessage({ action: 'liveStatus', status: `Wave ${progress} - Scanning...` });
      updateStatus(`Wave ${progress} - Scanning...`);
      await scrapeCurrentView();
      
      await safeSendMessage({ action: 'liveStatus', status: `Wave ${progress} - Scrolling...` });
      updateStatus(`Wave ${progress} - Scrolling...`);
      await stealth.humanScroll();
      currentScrolls++;
      
      await safeSendMessage({ action: 'incrementScroll' });
      await stealth.wait(3000); // Wait for lazy load
    }

    updateStatus('Scraping Finished!', 'success');
    await safeSendMessage({ action: 'liveStatus', status: 'Scraping Finished!' });
    
    setTimeout(() => {
      const bubble = document.getElementById('job-applier-status');
      if (bubble) bubble.remove();
    }, 5000);
    
    await safeSendMessage({ action: 'scrapingFinished' });
  } catch (e) {
    console.error('[Job Applier PRO] Session Error:', e);
    updateStatus('System Interrupted', 'error');
    await safeSendMessage({ action: 'liveStatus', status: 'Error: System Interrupted' });
  }
}

// --- Logic ---
async function expandAllPosts() {
  // Better "See more" detection
  const seeMoreSelectors = [
    'button.feed-shared-inline-show-more-text__see-more-less-toggle',
    'button.ls-is-see-more',
    'button[aria-label*="see more"]',
    'button[aria-label*="...more"]'
  ];

  const btns = [];
  seeMoreSelectors.forEach(selector => {
    btns.push(...Array.from(document.querySelectorAll(selector)));
  });

  // Fallback to text-based search for buttons/spans that look like "see more"
  if (btns.length === 0) {
    const allBtns = Array.from(document.querySelectorAll('button, span[role="button"]'));
    btns.push(...allBtns.filter(b => {
      const t = b.innerText.toLowerCase();
      return t === 'see more' || t === '...more' || t.includes('show more');
    }));
  }

  for (const b of btns) {
    try {
      const r = b.getBoundingClientRect();
      if (r.top >= -500 && r.bottom <= window.innerHeight + 500) { // Click even if slightly off-screen
        b.click();
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {}
  }
}

async function scrapeCurrentView() {
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Find all post containers
  const containers = document.querySelectorAll('.reusable-search__result-container, .feed-shared-update-v2, .search-results-container, article');
  const leads = [];
  const seenInThisWave = new Set();

  for (const container of containers) {
    const text = container.innerText;
    const emails = text.match(EMAIL_REGEX);
    
    if (emails) {
      for (const email of emails) {
        const lowerEmail = email.toLowerCase();
        if (seenInThisWave.has(lowerEmail)) continue;
        
        // Highlight post visually
        container.style.border = '2px solid #00d2ff';
        container.style.borderRadius = '8px';
        container.style.backgroundColor = 'rgba(0, 210, 255, 0.05)';

        const company = extractCompany(container) || extractFromEmail(lowerEmail);
        const title = guessJobTitle(text);

        leads.push({
          email: lowerEmail,
          company: company,
          title: title,
          context: text.substring(0, 1000)
        });
        seenInThisWave.add(lowerEmail);
      }
    }
  }

  if (leads.length > 0) {
    await safeSendMessage({ action: 'newLeadsFound', leads });
  }
}

function extractCompany(container) {
  // Try to find the company name or actor title
  const selectors = [
    '.update-components-actor__title',
    '.app-aware-link',
    'strong',
    '[data-test-app-aware-link]'
  ];
  
  for (const s of selectors) {
    const el = container.querySelector(s);
    if (el) {
      const name = el.innerText.split('\n')[0].trim();
      if (name && name.length > 2 && name.length < 50 && !name.includes('@')) return name;
    }
  }
  return null;
}

function guessJobTitle(text) {
  const keywords = ['Full Stack', 'MERN', 'Next.js', 'Frontend', 'Backend', 'Software', 'React', 'Node', 'Java', 'Python', 'Mobile'];
  const lowerText = text.toLowerCase();
  for (const kw of keywords) {
    if (lowerText.includes(kw.toLowerCase())) return kw + ' Developer';
  }
  return 'Hiring Lead';
}

function extractFromEmail(email) {
  const d = email.split('@')[1]?.split('.')[0] || 'Direct';
  const ignore = ['gmail', 'yahoo', 'outlook', 'hotmail', 'rediff', 'icloud'];
  if (ignore.includes(d.toLowerCase())) return 'Direct Recruiter';
  return d.charAt(0).toUpperCase() + d.slice(1);
}
