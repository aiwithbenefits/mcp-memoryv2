import { v4 as uuidv4 } from "uuid";
import type { EmailMetadata, EmailSearchResult } from '../types';

// Minimum similarity score for vector search results
const MINIMUM_SIMILARITY_SCORE = 0.0;

/**
 * Generates vector embeddings from text using Cloudflare's AI model
 */
async function generateEmbeddings(text: string, env: Env): Promise<number[]> {
  const embeddings = (await env.AI.run("@cf/baai/bge-m3", {
    text,
  })) as AiTextEmbeddingsOutput;

  const values = embeddings.data[0];
  if (!values) throw new Error("Failed to generate vector embedding");

  return values;
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
 * Stores an email memory in Vectorize with enhanced metadata
 */
export async function storeEmailMemory(
  metadata: EmailMetadata,
  userId: string,
  env: Env,
  memoryId: string = uuidv4()
): Promise<string> {
  // Create comprehensive content for vectorization
  const fullContent = createEmailContent(metadata);
  
  // Generate embedding
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

  return memoryId;
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
 * Enhanced search for email memories with multiple search strategies
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
  console.log(`Searching email memories for user ${userId} with query: "${query}"`);
  
  // Generate embedding for query
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

  console.log(`Found ${results.matches.length} vector matches`);

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
 * Updates an email memory vector embedding
 */
export async function updateEmailMemoryVector(
  memoryId: string,
  metadata: Partial<EmailMetadata>,
  userId: string,
  env: Env
): Promise<void> {
  // Fetch existing metadata if partial update
  const existingResults = await env.VECTORIZE.getByIds([memoryId], { namespace: userId });
  const existingMetadata = existingResults.length > 0 ? existingResults[0].metadata : {};
  
  // Merge metadata
  const fullMetadata = { ...existingMetadata, ...metadata } as EmailMetadata;
  
  // Create comprehensive content for vectorization
  const fullContent = createEmailContent(fullMetadata);
  
  // Generate new embedding
  const newValues = await generateEmbeddings(fullContent, env);

  // Upsert into Vectorize to update
  await env.VECTORIZE.upsert([
    {
      id: memoryId,
      values: newValues,
      namespace: userId,
      metadata: fullMetadata,
    },
  ]);

  console.log(`Email vector for memory ${memoryId} updated.`);
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
 * Find similar emails based on content similarity
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
    const emailVectors = await env.VECTORIZE.getByIds([emailId], { namespace: userId });
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
    return results.matches
      .filter(match => match.id !== emailId)
      .slice(0, topK)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as Partial<EmailMetadata>
      }));
      
  } catch (error) {
    console.error(`Error finding similar emails for ${emailId}:`, error);
    throw error;
  }
}