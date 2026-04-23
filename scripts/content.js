(function() {
  console.log('🚀 [Job Applier PRO] Ultra-Aggressive Engine Initialized');

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let scrollCount = 0;
  const maxScrolls = 15;
  let isActive = false;

  // --- Visible UI ---
  function createBanner() {
    let banner = document.getElementById('job-applier-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'job-applier-banner';
      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        background: '#00d2ff',
        color: '#000',
        padding: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
        zIndex: '999999',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        fontSize: '16px',
        fontFamily: 'sans-serif'
      });
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateBanner(text) {
    const banner = createBanner();
    banner.innerText = `🤖 Job Applier PRO: ${text}`;
  }

  // --- Aggressive Scraping ---
  async function aggressiveScrape(searchedRole) {
    updateBanner('Scanning every corner of this page...');
    const leads = [];
    const seenEmails = new Set();

    // Walk through EVERY text node on the page
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      const matches = node.textContent.match(EMAIL_REGEX);
      if (matches) {
        matches.forEach(email => {
          const lowerEmail = email.toLowerCase();
          if (seenEmails.has(lowerEmail)) return;
          seenEmails.add(lowerEmail);

          // Find the post container by walking UP
          let parent = node.parentElement;
          let container = null;
          let depth = 0;
          while (parent && depth < 12) {
            const classes = (parent.className || '').toString();
            if (classes.includes('result') || classes.includes('update') || classes.includes('card') || parent.tagName === 'ARTICLE') {
              container = parent;
              break;
            }
            parent = parent.parentElement;
            depth++;
          }

          // Visual feedback
          if (container) {
            container.style.border = '3px solid #00d2ff';
            container.style.backgroundColor = 'rgba(0, 210, 255, 0.1)';
          }

          const textContext = container ? container.innerText : node.textContent;
          const company = extractCompany(container, lowerEmail);
          const title = guessJobTitle(textContext, searchedRole);

          leads.push({
            email: lowerEmail,
            company: company,
            title: title,
            id: 'lead_' + Math.random().toString(36).substr(2, 9)
          });
        });
      }
    }

    if (leads.length > 0) {
      updateBanner(`Found ${leads.length} new leads!`);
      chrome.runtime.sendMessage({ action: 'newLeadsFound', leads });
    } else {
      updateBanner('No emails found in this view. Scrolling...');
    }
  }

  function extractCompany(container, email) {
    // 1. Try to find Actor Name from post
    if (container) {
      const selectors = [
        '.update-components-actor__title',
        '.feed-shared-actor__title',
        'strong',
        '.app-aware-link'
      ];
      for (const s of selectors) {
        const el = container.querySelector(s);
        if (el) {
          const name = el.innerText.split('•')[0].split('\n')[0].trim();
          if (name && name.length > 2 && name.length < 40 && !name.toLowerCase().includes('hiring')) return name;
        }
      }
    }

    // 2. Fallback: Extract from Email Domain
    try {
      const domain = email.split('@')[1].toLowerCase();
      let company = domain.split('.')[0];
      const ignore = ['gmail', 'yahoo', 'outlook', 'hotmail', 'rediff', 'icloud', 'me', 'protonmail'];
      
      if (ignore.includes(company)) return 'Direct Recruiter';
      
      // Capitalize
      return company.charAt(0).toUpperCase() + company.slice(1);
    } catch (e) {
      return 'Direct Recruiter';
    }
  }

  function guessJobTitle(text, searchedRole = 'Full Stack Developer') {
    const keywords = ['Full Stack', 'MERN', 'Next.js', 'Frontend', 'Backend', 'React', 'Node', 'Java', 'Python', 'Mobile', 'Flutter', 'UI/UX', 'Software', 'Web', 'Developer'];
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      if (lowerText.includes(kw.toLowerCase())) return kw + ' Developer';
    }
    return searchedRole || 'Hiring Lead';
  }

  async function runSession() {
    const data = await new Promise(r => chrome.storage.local.get(['isScraping', 'currentRole'], r));
    if (!data.isScraping) {
      const banner = document.getElementById('job-applier-banner');
      if (banner) banner.remove();
      return;
    }

    if (scrollCount < maxScrolls) {
      scrollCount++;
      updateBanner(`Wave ${scrollCount}/${maxScrolls} - Scrolling and Expanding...`);
      
      // Expand "See more"
      const btns = Array.from(document.querySelectorAll('button')).filter(b => {
        const t = b.innerText.toLowerCase();
        return t.includes('see more') || t.includes('...more');
      });
      btns.forEach(b => { try { b.click(); } catch(e) {} });

      await new Promise(r => setTimeout(r, 1000));
      
      await aggressiveScrape(data.currentRole);
      
      // Better scroll
      window.scrollBy({ top: 800, behavior: 'smooth' });
      
      setTimeout(runSession, 3500);
    } else {
      updateBanner('🏁 Scraping Finished!');
      setTimeout(() => {
        const banner = document.getElementById('job-applier-banner');
        if (banner) banner.remove();
      }, 5000);
      chrome.runtime.sendMessage({ action: 'scrapingFinished' });
    }
  }

  // --- Initializer ---
  if (window.location.href.includes('linkedin.com/search/results/content')) {
    chrome.storage.local.get(['isScraping'], (data) => {
      if (data.isScraping) {
        isActive = true;
        createBanner();
        updateBanner('Engine Started. Waiting for LinkedIn to settle...');
        setTimeout(runSession, 4000);
      }
    });
  }
})();
