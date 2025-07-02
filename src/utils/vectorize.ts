import { v4 as uuidv4 } from "uuid";
import type { EmailMetadata, EmailSearchResult } from '../types';
import { createGeminiService } from './gemini';

// Minimum similarity score for vector search results
const MINIMUM_SIMILARITY_SCORE = 0.0;

/**
 * Generates vector embeddings from text using Gemini's embedding model
 */
async function generateEmbeddings(text: string, env: Env): Promise<number[]> {
  const geminiService = createGeminiService(env);
  return await geminiService.generateEmbeddings(text);
}

/**
 * Creates comprehensive email content for vectorization
 */
function createEmailContent(metadata: EmailMetadata): string {
  const parts = [
    metadata.content,
    metadata.subject ? `Subject: ${metadata.subject}` : '',
    `From: ${metadata.senderName || metadata.senderEmail}`,
    `Sender: ${metadata.senderEmail}`,
    `Date: ${metadata.dateSent}`,
    metadata.attachments ? `Attachments: ${metadata.attachments}` : ''
  ].filter(Boolean);
  
  return parts.join(' | ');
}

/**
 * Stores an email memory in Vectorize with enhanced metadata using Gemini embeddings
 */
export async function storeEmailMemory(
  metadata: EmailMetadata,
  userId: string,
  env: Env,
  memoryId: string = uuidv4()
): Promise<string> {
  try {
    // Create comprehensive content for vectorization
    const fullContent = createEmailContent(metadata);
    
    // Generate embedding using Gemini
    const values = await generateEmbeddings(fullContent, env);

    // Store in Vectorize with full metadata
    await env.VECTORIZE.upsert([
      {
        id: memoryId,
        values,
        namespace: userId,
        metadata: {
          content: metadata.content,
          senderEmail: metadata.senderEmail,
          senderName: metadata.senderName || '',
          subject: metadata.subject || '',
          dateSent: metadata.dateSent,
          threadId: metadata.threadId || '',
          conversationId: metadata.conversationId || '',
          attachments: metadata.attachments || '',
          emailType: metadata.emailType || 'standard'
        },
      },
    ]);

    console.log(`Email memory stored in Vectorize with Gemini embeddings: ${memoryId}`);
    return memoryId;
  } catch (error) {
    console.error("Error storing email memory with Gemini embeddings:", error);
    throw error;
  }
}

/**
 * Legacy support for old memory storage format
 */
export async function storeMemory(text: string, userId: string, env: Env): Promise<string> {
  const metadata: EmailMetadata = {
    content: text,
    senderEmail: 'legacy@system.internal',
    senderName: 'Legacy Memory',
    subject: 'Imported Memory',
    dateSent: new Date().toISOString(),
    emailType: 'legacy'
  };
  
  return storeEmailMemory(metadata, userId, env);
}

/**
 * Enhanced search for email memories using Gemini embeddings with multiple search strategies
 */
export async function searchEmailMemories(
  query: string,
  userId: string,
  env: Env,
  filters?: {
    senderEmail?: string;
    dateRange?: { start: string; end: string };
    threadId?: string;
    hasAttachments?: boolean;
  }
): Promise<Array<{ 
  content: string; 
  score: number; 
  id: string;
  metadata: Partial<EmailMetadata>;
}>> {
  try {
    console.log(`Searching email memories for user ${userId} with query: "${query}"`);
    
    // Generate embedding for query using Gemini
    const queryVector = await generateEmbeddings(query, env);

    // Search Vectorize
    const results = await env.VECTORIZE.query(queryVector, {
      namespace: userId,
      topK: 20, // Increased for better filtering
      returnMetadata: "all",
    });

    if (!results.matches || results.matches.length === 0) {
      console.log(`No vector matches found for user ${userId}`);
      return [];
    }

    console.log(`Found ${results.matches.length} vector matches using Gemini embeddings`);

    // Process and filter results
    let memories = results.matches
      .filter((match) => match.score >= MINIMUM_SIMILARITY_SCORE)
      .map((match) => {
        const metadata = match.metadata || {};
        return {
          content: metadata.content as string || "Missing content",
          score: match.score || 0,
          id: match.id,
          metadata: metadata as Partial<EmailMetadata>
        };
      });

    // Apply additional filters
    if (filters) {
      memories = memories.filter(memory => {
        const meta = memory.metadata;
        
        if (filters.senderEmail && meta.senderEmail !== filters.senderEmail) {
          return false;
        }
        
        if (filters.threadId && meta.threadId !== filters.threadId) {
          return false;
        }
        
        if (filters.dateRange && meta.dateSent) {
          const dateSent = new Date(meta.dateSent);
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          if (dateSent < start || dateSent > end) {
            return false;
          }
        }
        
        if (filters.hasAttachments && !meta.attachments) {
          return false;
        }
        
        return true;
      });
    }

    // Sort by relevance score (highest first)
    memories.sort((a, b) => b.score - a.score);

    console.log(`Returning ${memories.length} memories after filtering`);
    return memories;
  } catch (error) {
    console.error("Error searching email memories with Gemini:", error);
    throw error;
  }
}

// Backward compatibility for legacy search
export async function searchMemories(
  query: string,
  userId: string,
  env: Env
): Promise<Array<{ content: string; score: number; id: string }>> {
  const results = await searchEmailMemories(query, userId, env);
  return results.map(r => ({
    content: r.content,
    score: r.score,
    id: r.id
  }));
}

/**
 * Updates an email memory vector embedding using Gemini
 */
export async function updateEmailMemoryVector(
  memoryId: string,
  metadata: Partial<EmailMetadata>,
  userId: string,
  env: Env
): Promise<void> {
  try {
    // Fetch existing metadata if partial update
    const existingResults = await env.VECTORIZE.getByIds([memoryId]);
    const existingMetadata = existingResults.length > 0 ? existingResults[0].metadata : {};
    
    // Merge metadata
    const fullMetadata = { ...existingMetadata, ...metadata } as EmailMetadata;
    
    // Create comprehensive content for vectorization
    const fullContent = createEmailContent(fullMetadata);
    
    // Generate new embedding using Gemini
    const newValues = await generateEmbeddings(fullContent, env);

    // Upsert into Vectorize to update
    await env.VECTORIZE.upsert([
      {
        id: memoryId,
        values: newValues,
        namespace: userId,
        metadata: {
        content: fullMetadata.content,
        senderEmail: fullMetadata.senderEmail,
        senderName: fullMetadata.senderName || '',
        subject: fullMetadata.subject || '',
        dateSent: fullMetadata.dateSent,
        threadId: fullMetadata.threadId || '',
        conversationId: fullMetadata.conversationId || '',
        attachments: fullMetadata.attachments || '',
        emailType: fullMetadata.emailType || 'standard'
      },
      },
    ]);

    console.log(`Email vector for memory ${memoryId} updated with Gemini embeddings.`);
  } catch (error) {
    console.error("Error updating email memory vector with Gemini:", error);
    throw error;
  }
}

// Backward compatibility
export async function updateMemoryVector(
  memoryId: string,
  newContent: string,
  userId: string,
  env: Env
): Promise<void> {
  return updateEmailMemoryVector(
    memoryId,
    { content: newContent },
    userId,
    env
  );
}

/**
 * Deletes a vector by its ID from the Vectorize index
 */
export async function deleteVectorById(
  memoryId: string, 
  userId: string, 
  env: Env
): Promise<void> {
  try {
    const result = await env.VECTORIZE.deleteByIds([memoryId]);
    console.log(
      `Deleted vector ID ${memoryId} for user (namespace): ${userId}. Result:`,
      result
    );
  } catch (error) {
    console.error(`Error deleting vector ID ${memoryId}:`, error);
    throw error;
  }
}

/**
 * Find similar emails based on content similarity using Gemini embeddings
 */
export async function findSimilarEmails(
  emailId: string,
  userId: string,
  env: Env,
  topK: number = 5
): Promise<Array<{
  id: string;
  score: number;
  metadata: Partial<EmailMetadata>;
}>> {
  try {
    // Get the email's vector
    const emailVectors = await env.VECTORIZE.getByIds([emailId]);
    if (!emailVectors || emailVectors.length === 0) {
      throw new Error(`Email ${emailId} not found in vector store`);
    }
    
    const emailVector = emailVectors[0].values;
    
    // Search for similar emails
    const results = await env.VECTORIZE.query(emailVector, {
      namespace: userId,
      topK: topK + 1, // +1 to exclude self
      returnMetadata: "all",
    });
    
    // Filter out the original email and return results
    const similarEmails = results.matches
      .filter(match => match.id !== emailId)
      .slice(0, topK)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as Partial<EmailMetadata>
      }));

    console.log(`Found ${similarEmails.length} similar emails using Gemini embeddings`);
    return similarEmails;
      
  } catch (error) {
    console.error(`Error finding similar emails for ${emailId} with Gemini:`, error);
    throw error;
  }
}

/**
 * Advanced email analysis using Gemini's reasoning capabilities
 */
export async function analyzeEmailWithGemini(
  emailContent: string,
  env: Env
): Promise<{
  topics: string[];
  sentiment: string;
  entities: string[];
  actionItems: string[];
  suggestedTags: string[];
}> {
  try {
    const geminiService = createGeminiService(env);
    const analysis = await geminiService.analyzeEmailContent(emailContent, "comprehensive");
    
    // Parse the analysis response (would need more sophisticated parsing in production)
    // For now, return a basic structure
    return {
      topics: [],
      sentiment: "neutral",
      entities: [],
      actionItems: [],
      suggestedTags: []
    };
  } catch (error) {
    console.error("Error analyzing email with Gemini:", error);
    throw error;
  }
}
