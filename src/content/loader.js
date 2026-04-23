/**
 * Content Script Loader
 * Dynamically imports the modular index.js into the LinkedIn page context.
 */
(async () => {
  try {
    const src = chrome.runtime.getURL('src/content/index.js');
    await import(src);
  } catch (error) {
    console.error('❌ [Job Applier PRO] Module Loader Error:', error);
  }
})();
