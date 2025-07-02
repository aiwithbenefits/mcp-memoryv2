import OpenAI from 'openai';
import { GEMINI_SYSTEM_INSTRUCTIONS } from '../types';

/**
 * Gemini AI service using OpenAI SDK compatibility
 */
export class GeminiService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
  }

  /**
   * Generate embeddings using Gemini's text embedding model
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: "text-embedding-004",
        input: text,
        encoding_format: "float"
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding data returned from Gemini");
      }

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating Gemini embeddings:", error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Generate chat completion using Gemini-2.5-pro with comprehensive system instructions
   */
  async generateCompletion(
    prompt: string,
    context?: any
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: GEMINI_SYSTEM_INSTRUCTIONS
          },
          {
            role: "user", 
            content: context ? `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}` : prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No completion response from Gemini");
      }

      return response.choices[0].message?.content || "";
    } catch (error) {
      console.error("Error generating Gemini completion:", error);
      throw new Error(`Failed to generate completion: ${error}`);
    }
  }

  /**
   * Analyze email content and extract insights
   */
  async analyzeEmailContent(emailContent: string, analysisType: string = "general"): Promise<string> {
    const prompt = `Analyze this email content for ${analysisType} insights:

Email Content:
${emailContent}

Provide a detailed analysis including:
- Key topics and themes
- Sentiment and tone
- Important entities (people, organizations, dates)
- Action items or requests
- Context and implications
`;

    return this.generateCompletion(prompt);
  }

  /**
   * Generate summary of multiple emails
   */
  async summarizeEmails(emails: Array<{subject?: string, body: string, sender: string, date: string}>): Promise<string> {
    const emailsText = emails.map(email => 
      `From: ${email.sender} | Date: ${email.date} | Subject: ${email.subject || '(no subject)'}\n${email.body}`
    ).join('\n\n---\n\n');

    const prompt = `Summarize these emails and identify key patterns, themes, and insights:

${emailsText}

Provide:
1. Executive summary
2. Key themes and topics
3. Important dates and deadlines
4. Action items across all emails
5. Communication patterns
`;

    return this.generateCompletion(prompt);
  }

  /**
   * Suggest email thread relationships
   */
  async suggestEmailRelationships(emails: Array<{id: string, subject?: string, body: string, sender: string}>): Promise<Array<{email1: string, email2: string, relationship: string, confidence: number}>> {
    const emailsContext = emails.map(email => ({
      id: email.id,
      subject: email.subject || '(no subject)',
      sender: email.sender,
      contentPreview: email.body.substring(0, 200)
    }));

    const prompt = `Analyze these emails and suggest relationships between them. Return a JSON array of relationships:

${JSON.stringify(emailsContext, null, 2)}

Return format:
[
  {
    "email1": "email_id_1",
    "email2": "email_id_2", 
    "relationship": "follow-up|reference|related-topic|thread",
    "confidence": 0.85
  }
]

Only suggest relationships with confidence > 0.7. Consider:
- Subject line similarities
- Content references
- Sender patterns
- Temporal proximity
`;

    const response = await this.generateCompletion(prompt);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error("Error parsing relationship suggestions:", error);
      return [];
    }
  }
}

/**
 * Create Gemini service instance
 */
export function createGeminiService(env: Env): GeminiService {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  
  return new GeminiService(env.GEMINI_API_KEY);
}
