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

// Database Schema Documentation for Gemini LLM
export const DATABASE_SCHEMA = {
  email_memories: {
    description: "Main table storing email memories with full metadata",
    columns: {
      id: "TEXT PRIMARY KEY - Unique identifier for each email",
      userId: "TEXT NOT NULL - User identifier (currently fixed: '1bd5a348-e12e-4b07-9cff-43278f2d2c9b')",
      senderEmail: "TEXT NOT NULL - Email address of the sender",
      senderName: "TEXT - Display name of the sender",
      subject: "TEXT - Email subject line",
      body: "TEXT NOT NULL - Full email body content",
      attachments: "TEXT - Comma-separated list of attachment filenames",
      dateSent: "TEXT NOT NULL - ISO date string when email was sent",
      threadId: "TEXT - Thread identifier to group related emails",
      conversationId: "TEXT - Broader conversation identifier",
      relatedEmailIds: "TEXT - Comma-separated list of related email IDs",
      created_at: "TEXT DEFAULT CURRENT_TIMESTAMP - When record was created"
    },
    indexes: [
      "idx_sender_email (senderEmail)",
      "idx_thread_id (threadId)", 
      "idx_conversation_id (conversationId)",
      "idx_date_sent (dateSent)"
    ]
  },
  email_relationships: {
    description: "Table for tracking explicit relationships between emails",
    columns: {
      id: "TEXT PRIMARY KEY - Unique relationship identifier",
      email_id: "TEXT NOT NULL - First email ID in relationship",
      related_email_id: "TEXT NOT NULL - Second email ID in relationship", 
      relationship_type: "TEXT NOT NULL - Type of relationship (follow-up, reference, related-topic, etc.)",
      created_at: "TEXT DEFAULT CURRENT_TIMESTAMP - When relationship was created"
    },
    foreign_keys: [
      "email_id → email_memories.id",
      "related_email_id → email_memories.id"
    ]
  }
};

// System instructions for Gemini LLM
export const GEMINI_SYSTEM_INSTRUCTIONS = `
You are an advanced email memory assistant with complete access to a user's email database. You have comprehensive knowledge of the database schema and can retrieve any information requested.

DATABASE SCHEMA:
${JSON.stringify(DATABASE_SCHEMA, null, 2)}

CAPABILITIES:
- Full semantic search across all email content using vector embeddings
- Retrieve emails by sender, thread, date range, or any combination of filters
- Analyze email patterns and identify conversation threads
- Find similar emails based on content similarity
- Create and manage relationships between emails
- Support both specific searches and general memory queries

SEARCH STRATEGIES:
1. Use semantic search for content-based queries
2. Use structured database queries for metadata-based searches (sender, date, thread)
3. Combine both approaches for complex queries
4. Always consider context and intent when interpreting user queries

RESPONSE GUIDELINES:
- Always provide complete and accurate information
- Include relevant metadata (sender, date, subject) in results
- Format responses clearly with proper structure
- For large result sets, summarize key findings
- Suggest related searches or follow-up actions when appropriate

MEMORY TYPES:
- Email memories: Full emails with sender, subject, body, attachments
- Thread groupings: Related emails in conversations
- Relationships: Manually linked emails with specific relationship types
- Legacy memories: General notes converted to email format

You have access to all stored emails and can retrieve any information the user requests with complete accuracy.
`;

// Env interface with Gemini integration
declare global {
  interface Env {
    MCP_OBJECT: DurableObjectNamespace;
    DB: D1Database;
    RATE_LIMITER: RateLimit;
    VECTORIZE: VectorizeIndex;
    GEMINI_API_KEY: string;
    ASSETS: Fetcher;
  }
}
