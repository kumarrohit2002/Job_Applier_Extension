(function() {
  console.log('🚀 [Job Applier PRO] Ultra-Aggressive Engine Initialized');

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+(@|\[at\]|\(at\)| @ | at )[a-zA-Z0-9.-]+(\.|\[dot\]|\(dot\)| \. | dot )[a-zA-Z]{2,}/gi;
  let scrollCount = 0;
  const maxScrolls = 20;
  let resultIndex = 0;

  // --- Helpers ---
  const wait = (ms) => new Promise(r => setTimeout(r, ms + Math.random() * 500));

  async function humanScroll(distance = 800) {
    window.scrollBy({ top: distance, behavior: 'smooth' });
    await wait(2000);
  }

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
        background: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)',
        color: '#fff',
        padding: '12px',
        textAlign: 'center',
        fontWeight: 'bold',
        zIndex: '999999',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        fontSize: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease'
      });
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateBanner(text) {
    const banner = createBanner();
    banner.innerHTML = `🤖 <span style="color: #fff">Job Applier PRO:</span> <span style="color: #ffeb3b">${text}</span>`;
    console.log(`[Job Applier PRO] ${text}`);
  }

  // --- UI Injection ---
  function injectResultUI(container, email = null, status = 'new') {
    if (!container || typeof container.querySelector !== 'function') return;
    
    try {
      let meta = container.querySelector('.job-applier-meta');
      if (!meta) {
        resultIndex++;
        meta = document.createElement('div');
        meta.className = 'job-applier-meta';
        Object.assign(meta.style, {
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: '1000',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none'
        });

        const numBadge = document.createElement('span');
        numBadge.innerText = `#${resultIndex}`;
        Object.assign(numBadge.style, {
          background: '#00d2ff',
          color: '#000',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '900',
          boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
          width: 'fit-content',
          border: '1px solid #fff'
        });
        meta.appendChild(numBadge);

        if (window.getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }
        container.prepend(meta);
      }

      if (email) {
        let statusContainer = meta.querySelector('.status-container');
        if (!statusContainer) {
          statusContainer = document.createElement('div');
          statusContainer.className = 'status-container';
          Object.assign(statusContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'auto'
          });
          meta.appendChild(statusContainer);
        }

        statusContainer.innerHTML = ''; 

        const statusBadge = document.createElement('span');
        statusBadge.innerText = status === 'applied' ? '✅ EMAILED' : '📧 EMAIL FOUND';
        Object.assign(statusBadge.style, {
          background: status === 'applied' ? '#10b981' : '#ff9800',
          color: '#fff',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '900',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          textAlign: 'center',
          border: '1px solid #fff'
        });
        statusContainer.appendChild(statusBadge);

        if (status !== 'applied') {
          const draftBtn = document.createElement('button');
          draftBtn.innerText = 'DRAFT EMAIL';
          Object.assign(draftBtn.style, {
            background: '#0a66c2',
            color: '#fff',
            border: '1px solid #fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            marginTop: '2px'
          });
          draftBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleManualDraft(container, email);
          };
          statusContainer.appendChild(draftBtn);
        }
      }
    } catch (err) {
      console.error('[Job Applier PRO] UI Injection Error:', err);
    }
  }

  async function handleManualDraft(container, email) {
    updateBanner(`Drafting email for ${email}...`);
    const textContext = container.innerText;
    const company = extractCompany(container, email);
    const title = guessJobTitle(textContext);

    chrome.runtime.sendMessage({
      action: 'newLeadsFound',
      leads: [{
        email,
        company,
        title,
        id: 'lead_' + Math.random().toString(36).substr(2, 9)
      }]
    });

    setTimeout(() => {
      injectResultUI(container, email, 'applied');
      updateBanner(`Success! Draft created for ${email}`);
    }, 1000);
  }

  // --- Core Scraper ---
  async function aggressiveScrape(searchedRole, existingLeads) {
    try {
      updateBanner('Scanning for leads...');
      const leadsFound = [];
      const seenEmailsInWave = new Set();

      // Expanded selectors for LinkedIn containers
      const selectors = [
        '.reusable-search__result-container',
        '.feed-shared-update-v2',
        '.search-results-container',
        'article',
        '.update-components-definition-list',
        '.jobs-search-results__list-item',
        '.feed-shared-update-v2__control-menu-container'
      ];

      let containers = document.querySelectorAll(selectors.join(','));
      
      // Fallback: If no containers, try to find things that look like posts
      if (containers.length < 3) {
        containers = Array.from(document.querySelectorAll('div')).filter(el => {
          const classes = el.className || '';
          return typeof classes === 'string' && (classes.includes('update') || classes.includes('post') || classes.includes('card'));
        });
      }

      console.log(`[Job Applier PRO] Scanning ${containers.length} potential containers.`);

      for (const container of containers) {
        const text = container.innerText || '';
        if (text.length < 50) continue; // Skip tiny elements

        // Clean text for regex matching (handle obfuscation)
        const cleanText = text.replace(/\[at\]|\(at\)| @ | at /gi, '@').replace(/\[dot\]|\(dot\)| \. | dot /gi, '.');
        const matches = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
        
        if (matches) {
          injectResultUI(container); // Mark it found something

          matches.forEach(email => {
            const lowerEmail = email.toLowerCase().trim();
            if (seenEmailsInWave.has(lowerEmail)) return;
            seenEmailsInWave.add(lowerEmail);

            // Visual feedback
            container.style.border = '2px solid #00d2ff';
            container.style.boxShadow = '0 0 15px rgba(0, 210, 255, 0.4)';
            container.style.borderRadius = '8px';

            const existing = existingLeads.find(l => l.email === lowerEmail);
            const status = existing ? existing.status : 'new';

            injectResultUI(container, lowerEmail, status);

            if (!existing) {
              const company = extractCompany(container, lowerEmail);
              const title = guessJobTitle(text, searchedRole);
              leadsFound.push({
                email: lowerEmail,
                company: company,
                title: title,
                id: 'lead_' + Math.random().toString(36).substr(2, 9)
              });
            }
          });
        }
      }

      // Final fallback: Global scan if still nothing
      if (leadsFound.length === 0 && seenEmailsInWave.size === 0) {
        console.log('[Job Applier PRO] Container scan dry. Trying global scan.');
        const bodyText = document.body.innerText.replace(/\[at\]|\(at\)| @ | at /gi, '@').replace(/\[dot\]|\(dot\)| \. | dot /gi, '.');
        const globalMatches = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
        if (globalMatches) {
          globalMatches.forEach(email => {
            const lowerEmail = email.toLowerCase().trim();
            const existing = existingLeads.find(l => l.email === lowerEmail);
            if (!existing && !seenEmailsInWave.has(lowerEmail)) {
              seenEmailsInWave.add(lowerEmail);
              
              // Use domain extraction for global scan too!
              const company = extractCompany(null, lowerEmail);
              
              leadsFound.push({
                email: lowerEmail,
                company: company,
                title: searchedRole || 'Hiring Lead',
                id: 'lead_' + Math.random().toString(36).substr(2, 9)
              });
            }
          });
        }
      }

      if (leadsFound.length > 0) {
        updateBanner(`Success: Found ${leadsFound.length} new leads!`);
        chrome.runtime.sendMessage({ action: 'newLeadsFound', leads: leadsFound });
      } else {
        updateBanner(`Wave ${scrollCount} - No new emails found. Continuing...`);
      }
    } catch (err) {
      console.error('[Job Applier PRO] Scrape Error:', err);
      updateBanner('Scan Interrupted. Retrying...');
    }
  }

  function extractCompany(container, email) {
    if (container) {
      const selectors = [
        '.update-components-actor__title', 
        '.feed-shared-actor__title', 
        'strong', 
        '.app-aware-link',
        '[data-test-app-aware-link]',
        '.job-card-container__company-name',
        '.entity-result__primary-subtitle',
        '.entity-result__title-text'
      ];
      for (const s of selectors) {
        const el = container.querySelector(s);
        if (el) {
          const name = el.innerText.split('•')[0].split('\n')[0].trim();
          if (name && name.length > 2 && name.length < 50 && !name.toLowerCase().includes('hiring') && !name.toLowerCase().includes('view profile')) return name;
        }
      }
    }
    
    // Domain-based extraction (Pro Level)
    try {
      const domain = email.split('@')[1].toLowerCase();
      const parts = domain.split('.');
      
      const commonProviders = [
        'gmail', 'yahoo', 'outlook', 'hotmail', 'rediff', 'icloud', 'me', 'protonmail', 
        'zoho', 'yandex', 'mail', 'live', 'msn', 'aol', 'gmx', 'proton', 'tutanota', 'rocketmail'
      ];

      let companyRaw = parts[0];
      
      if (commonProviders.includes(companyRaw)) return 'Direct Recruiter';

      // Advanced domain parsing
      if (parts.length >= 3) {
        const lastTwo = parts.slice(-2).join('.');
        const commonTLDs = ['co.in', 'com.au', 'org.uk', 'net.in', 'co.uk', 'com.br', 'com.mx'];
        if (commonTLDs.includes(lastTwo)) {
          companyRaw = parts[parts.length - 3];
        } else {
          companyRaw = parts[parts.length - 2];
        }
      } else if (parts.length === 2) {
        companyRaw = parts[0];
      }

      // Clean up and format
      if (commonProviders.includes(companyRaw.toLowerCase())) return 'Direct Recruiter';
      
      const company = companyRaw.replace(/[-_]/g, ' ');
      return company.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    } catch (e) { 
      return 'Hiring Company'; 
    }
  }

  function guessJobTitle(text, searchedRole = 'Full Stack Developer') {
    const keywords = ['Full Stack', 'MERN', 'Next.js', 'Frontend', 'Backend', 'React', 'Node', 'Java', 'Python', 'Mobile', 'Flutter', 'UI/UX', 'Software', 'Web', 'Developer', 'Engineer'];
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      if (lowerText.includes(kw.toLowerCase())) return kw + ' Developer';
    }
    return searchedRole || 'Hiring Lead';
  }

  async function expandPosts() {
    const seeMoreSelectors = [
      'button.feed-shared-inline-show-more-text__see-more-less-toggle',
      'button.ls-is-see-more',
      'button[aria-label*="see more"]',
      'button[aria-label*="...more"]',
      '.feed-shared-inline-show-more-text__see-more-less-toggle'
    ];

    const btns = [];
    seeMoreSelectors.forEach(selector => {
      btns.push(...Array.from(document.querySelectorAll(selector)));
    });

    if (btns.length === 0) {
      const allBtns = Array.from(document.querySelectorAll('button, span[role="button"]'));
      btns.push(...allBtns.filter(b => {
        const t = (b.innerText || '').toLowerCase();
        return t.includes('see more') || t === '...more';
      }));
    }

    for (const b of btns) {
      try {
        const rect = b.getBoundingClientRect();
        if (rect.top < window.innerHeight + 1000 && rect.bottom > -1000) {
          b.click();
          await wait(100);
        }
      } catch (e) {}
    }
  }

  async function runSession() {
    try {
      const data = await new Promise(r => chrome.storage.local.get(['isScraping', 'currentRole', 'leads'], r));
      if (!data.isScraping) {
        const banner = document.getElementById('job-applier-banner');
        if (banner) banner.remove();
        return;
      }

      const existingLeads = data.leads || [];

      if (scrollCount < maxScrolls) {
        scrollCount++;
        updateBanner(`Wave ${scrollCount}/${maxScrolls} - Expanding & Scanning...`);
        
        await expandPosts();
        await wait(1500);
        await aggressiveScrape(data.currentRole, existingLeads);
        
        await humanScroll(900);
        setTimeout(runSession, 3000);
      } else {
        updateBanner('🏁 Scraping Finished!');
        setTimeout(() => {
          const banner = document.getElementById('job-applier-banner');
          if (banner) banner.remove();
        }, 5000);
        chrome.runtime.sendMessage({ action: 'scrapingFinished' });
      }
    } catch (err) {
      console.error('[Job Applier PRO] Session Error:', err);
      updateBanner('Error encountered. Retrying in 5s...');
      setTimeout(runSession, 5000);
    }
  }

  // --- Initializer ---
  if (window.location.href.includes('linkedin.com/search/results/content') || window.location.href.includes('linkedin.com/search/results/all')) {
    chrome.storage.local.get(['isScraping'], async (data) => {
      if (data.isScraping) {
        createBanner();
        updateBanner('Engine Initialized. Waiting for content...');
        
        // Wait for results to actually load
        let attempts = 0;
        while (attempts < 20) {
          const results = document.querySelector('.reusable-search__result-container, .feed-shared-update-v2, article');
          if (results) break;
          await wait(1000);
          attempts++;
        }
        
        updateBanner('Content detected. Starting scan...');
        setTimeout(runSession, 2000);
      }
    });
  }
})();
