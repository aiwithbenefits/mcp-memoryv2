// Email Memory Types
export interface EmailMemory {
  id: string;
  userId: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  body: string;
  attachments: string;
  dateSent: string;
  threadId?: string;
  conversationId?: string;
  relatedEmailIds?: string;
  created_at?: string;
}

export interface EmailRelationship {
  id: string;
  email_id: string;
  related_email_id: string;
  relationship_type: string;
  created_at: string;
}

export interface EmailSearchFilters {
  senderEmail?: string;
  dateRange?: { start: string; end: string };
  threadId?: string;
  hasAttachments?: boolean;
}

export interface EmailMetadata {
  content: string;
  senderEmail: string;
  senderName?: string;
  subject?: string;
  dateSent: string;
  threadId?: string;
  conversationId?: string;
  attachments?: string;
  emailType?: string;
}

export interface EmailSearchResult {
  content: string;
  score: number;
  id: string;
  metadata: Partial<EmailMetadata>;
}

// Tool parameter types
export interface IngestEmailParams {
  senderEmail: string;
  senderName?: string;
  subject?: string;
  body: string;
  attachments?: string;
  dateSent: string;
  threadId?: string;
  conversationId?: string;
}

export interface SearchEmailParams {
  query: string;
  senderEmail?: string;
  startDate?: string;
  endDate?: string;
  threadId?: string;
  hasAttachments?: boolean;
}

export interface FindSimilarEmailsParams {
  emailId: string;
  limit?: number;
}

export interface LinkEmailsParams {
  emailId1: string;
  emailId2: string;
  relationshipType: string;
}

// Env interface extensions
interface AiTextEmbeddingsOutput {
  data: number[][];
}

declare global {
  interface Env {
    MCP_OBJECT: DurableObjectNamespace;
    DB: D1Database;
    RATE_LIMITER: RateLimit;
    VECTORIZE: VectorizeIndex;
    AI: {
      run(model: string, input: { text: string }): Promise<AiTextEmbeddingsOutput>;
    };
    ASSETS: Fetcher;
  }
}