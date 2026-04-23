import { OpenAIService } from './OpenAIService.js';

/**
 * AIService acts as a Gateway to handle on-device (Gemini) or Cloud-based (OpenAI) AI interactions.
 */
export class AIService {
  constructor() {
    this.geminiModel = null;
    this.openAIService = new OpenAIService();
  }

  async getProvider() {
    const data = await chrome.storage.local.get(['aiProvider']);
    return data.aiProvider || 'gemini';
  }

  async initGemini() {
    try {
      if (this.geminiModel) return true;
      const capabilities = await self.ai.languageModel.capabilities();
      if (capabilities.available === 'no') return false;
      
      this.geminiModel = await self.ai.languageModel.create({
        systemPrompt: "Senior Recruiting Assistant"
      });
      return true;
    } catch (e) { return false; }
  }

  /**
   * Main entry point for extraction.
   */
  async extractLeadData(text) {
    const provider = await this.getProvider();
    
    if (provider === 'openai') {
      return await this.openAIService.extractLeadData(text);
    }

    // Gemini Path
    if (!this.geminiModel) await this.initGemini();
    if (!this.geminiModel) return null; // Fallback to content script regex

    const prompt = `Extract JSON {companyName, jobTitle, hiringEmail, keySkills} from: "${text}"`;
    const response = await this.geminiModel.prompt(prompt);
    return JSON.parse(response.replace(/```json|```/g, '').trim());
  }

  /**
   * Main entry point for personalization.
   */
  async generatePersonalizedEmail(template, leadData, userProfile) {
    const provider = await this.getProvider();

    if (provider === 'openai') {
      return await this.openAIService.generatePersonalizedEmail(template, leadData);
    }

    // Gemini Fallback Logic (previously implemented)
    try {
      if (!this.geminiModel) await this.initGemini();
      if (!this.geminiModel) throw new Error('Gemini missing');
      
      const prompt = `Fill template: ${template} with Job: ${JSON.stringify(leadData)}`;
      return await this.geminiModel.prompt(prompt);
    } catch (e) {
      let body = template || '';
      body = body.replace(/{job_title}/g, leadData.title || 'the role');
      body = body.replace(/{company}/g, leadData.company || 'your company');
      return body;
    }
  }
}
