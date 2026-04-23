/**
 * StealthService provides human-like interaction patterns to evade automated detection.
 */
export class StealthService {
  /**
   * Performs a non-linear, jittery scroll to the bottom of the page.
   */
  async humanScroll() {
    const totalHeight = document.body.scrollHeight;
    let currentPosition = window.scrollY;
    
    while (currentPosition < totalHeight) {
      // Randomize scroll amount
      const step = Math.floor(Math.random() * 300) + 100;
      currentPosition += step;
      
      window.scrollTo({
        top: currentPosition,
        behavior: 'smooth'
      });
      
      // Variable delay between scrolls (human-like pause)
      const pause = Math.floor(Math.random() * 2000) + 1500;
      await new Promise(r => setTimeout(r, pause));
      
      // Update height in case of lazy loading
      if (document.body.scrollHeight > totalHeight) break; 
    }
  }

  /**
   * Random delay with Gaussian distribution centered around 'ms'.
   */
  async wait(ms) {
    const jitter = (Math.random() - 0.5) * (ms * 0.3); // 30% jitter
    await new Promise(r => setTimeout(r, ms + jitter));
  }

  /**
   * Simulates a "thinking" pause before an action.
   */
  async simulateThinking() {
    await this.wait(2000 + Math.random() * 3000);
  }
}
