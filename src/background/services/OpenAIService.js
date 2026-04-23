/**
 * OpenAIService handles communication with the OpenAI API for lead extraction and personalization.
 */
export class OpenAIService {
  constructor() {
    this.API_URL = 'https://api.openai.com/v1/chat/completions';
  }

  async getApiKey() {
    const data = await chrome.storage.local.get(['openaiKey']);
    return data.openaiKey;
  }

  /**
   * General purpose Chat completion helper.
   */
  async chat(systemPrompt, userPrompt) {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error('OpenAI API Key is missing. Please set it in the Setup tab.');

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to communicate with OpenAI');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Extracts lead data from LinkedIn post text.
   */
  async extractLeadData(text) {
    const systemPrompt = "You are a professional recruiting assistant. Extract lead information from LinkedIn posts in JSON format. Fields: companyName, jobTitle, hiringEmail, keySkills.";
    const userPrompt = `Extract JSON from this post: "${text}"`;

    const result = await this.chat(systemPrompt, userPrompt);
    return JSON.parse(result);
  }

  /**
   * Generates a personalized email.
   */
  async generatePersonalizedEmail(template, leadData) {
    const systemPrompt = "You are a job application expert. Fill in the template using the provided lead data. Make it sound professional and tailored.";
    const userPrompt = `Template: ${template}\nLead Data: ${JSON.stringify(leadData)}`;

    const result = await this.chat(systemPrompt, userPrompt);
    // Since we used json_object, we might need to extract a string field or just use the text.
    // Let's refine the system prompt for plain text return if needed, 
    // but json_object is safer for structured data.
    const json = JSON.parse(result);
    return json.personalizedEmail || json.emailContent || Object.values(json)[0];
  }
}
