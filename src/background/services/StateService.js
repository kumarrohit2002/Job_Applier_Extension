/**
 * StateService manages the ephemeral state of automation sessions.
 * Uses chrome.storage.session which lasts until the browser is closed.
 */
export class StateService {
  constructor() {
    this.DEFAULT_STATE = {
      isScraping: false,
      activeTabId: null,
      currentRole: null,
      currentSkills: null,
      startTime: null,
      scrollCount: 0
    };
  }

  async getState() {
    const data = await chrome.storage.local.get(['automationState']);
    return data.automationState || this.DEFAULT_STATE;
  }

  async setState(newState) {
    const currentState = await this.getState();
    const updatedState = { ...currentState, ...newState };
    await chrome.storage.local.set({ automationState: updatedState });
    
    // Broadcast state change
    chrome.runtime.sendMessage({ action: 'stateChanged', state: updatedState }).catch(() => {});
    return updatedState;
  }

  async startSession(tabId, role, skills) {
    return await this.setState({
      isScraping: true,
      activeTabId: tabId,
      currentRole: role,
      currentSkills: skills,
      startTime: Date.now(),
      scrollCount: 0
    });
  }

  async stopSession() {
    return await this.setState({ isScraping: false, activeTabId: null });
  }

  async incrementScroll() {
    const state = await this.getState();
    return await this.setState({ scrollCount: state.scrollCount + 1 });
  }
}
