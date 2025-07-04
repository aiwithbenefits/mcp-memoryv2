import { v4 as uuidv4 } from 'uuid';
import type { EmailMemory } from '../types';

/**
 * Ensures the email_memories table exists in D1 with proper schema for email storage
 */
export async function initializeDatabase(env: Env): Promise<void> {
  try {
    // Create main email memories table with comprehensive email fields - SIMPLIFIED
    const createEmailMemoriesTableQuery = "CREATE TABLE IF NOT EXISTS email_memories (id TEXT PRIMARY KEY, userId TEXT NOT NULL)";

    console.log("Executing SQL for email_memories (simplified):", createEmailMemoriesTableQuery);
    await env.DB.exec(createEmailMemoriesTableQuery);

    // Temporarily removed index creation for email_memories
    // Temporarily removed email_relationships table creation
    
    console.log("Simplified email_memories table creation attempted.");
  } catch (e) {
    console.error("Failed to create email memory tables in D1 (simplified attempt):", e);
    throw e;
  }
}

/**
 * Stores an email memory in D1 database
 */
export async function storeEmailMemoryInD1(
  email: Omit<EmailMemory, 'id' | 'created_at'>,
  env: Env,
  memoryId: string = uuidv4()
): Promise<string> {
  try {
    const stmt = env.DB.prepare(`
      INSERT INTO email_memories (
        id, userId, senderEmail, senderName, subject, body, 
        attachments, dateSent, threadId, conversationId, relatedEmailIds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      memoryId,
      email.userId,
      email.senderEmail,
      email.senderName || '',
      email.subject || '',
      email.body,
      email.attachments || '',
      email.dateSent,
      email.threadId || null,
      email.conversationId || null,
      email.relatedEmailIds || null
    ).run();

    console.log(`Email memory stored in D1 with ID: ${memoryId}`);
    return memoryId;
  } catch (error) {
    console.error("Error storing email memory in D1:", error);
    throw error;
  }
}

/**
 * Legacy support for old memory storage format
 */
export async function storeMemoryInD1(
  content: string,
  userId: string,
  env: Env,
  memoryId: string = uuidv4()
): Promise<string> {
  // Convert legacy format to email format
  const email = {
    userId,
    senderEmail: 'legacy@system.internal',
    senderName: 'Legacy Memory',
    subject: 'Imported Memory',
    body: content,
    attachments: '',
    dateSent: new Date().toISOString()
  };
  
  return storeEmailMemoryInD1(email, env, memoryId);
}

/**
 * Retrieves all email memories for a user from D1
 */
export async function getAllEmailMemoriesFromD1(userId: string, env: Env): Promise<EmailMemory[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_memories 
      WHERE userId = ? 
      ORDER BY dateSent DESC
    `).bind(userId).all();

    return result.results as unknown as EmailMemory[];
  } catch (error) {
    console.error("Error retrieving email memories from D1:", error);
    throw error;
  }
}

/**
 * Search emails by sender
 */
export async function getEmailsBySender(
  userId: string, 
  senderEmail: string, 
  env: Env
): Promise<EmailMemory[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_memories 
      WHERE userId = ? AND senderEmail = ? 
      ORDER BY dateSent DESC
    `).bind(userId, senderEmail).all();

    return result.results as unknown as EmailMemory[];
  } catch (error) {
    console.error("Error retrieving emails by sender:", error);
    throw error;
  }
}
/**
 * Get emails by thread ID
 */
export async function getEmailsByThread(
  userId: string, 
  threadId: string, 
  env: Env
): Promise<EmailMemory[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_memories 
      WHERE userId = ? AND threadId = ? 
      ORDER BY dateSent ASC
    `).bind(userId, threadId).all();

    return result.results as unknown as EmailMemory[];
  } catch (error) {
    console.error("Error retrieving emails by thread:", error);
    throw error;
  }
}

/**
 * Get emails within a date range
 */
export async function getEmailsByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  env: Env
): Promise<EmailMemory[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_memories 
      WHERE userId = ? AND dateSent >= ? AND dateSent <= ? 
      ORDER BY dateSent DESC
    `).bind(userId, startDate, endDate).all();

    return result.results as unknown as EmailMemory[];
  } catch (error) {
    console.error("Error retrieving emails by date range:", error);
    throw error;
  }
}
/**
 * Deletes an email memory from D1
 */
export async function deleteEmailMemoryFromD1(
  memoryId: string, 
  userId: string, 
  env: Env
): Promise<void> {
  try {
    // Delete relationships first
    await env.DB.prepare(
      "DELETE FROM email_relationships WHERE email_id = ? OR related_email_id = ?"
    ).bind(memoryId, memoryId).run();

    // Delete the email memory
    await env.DB.prepare(
      "DELETE FROM email_memories WHERE id = ? AND userId = ?"
    ).bind(memoryId, userId).run();

    console.log(`Email memory ${memoryId} deleted from D1`);
  } catch (error) {
    console.error("Error deleting email memory from D1:", error);
    throw error;
  }
}

/**
 * Updates an email memory in D1
 */
export async function updateEmailMemoryInD1(
  memoryId: string, 
  userId: string, 
  updates: Partial<EmailMemory>, 
  env: Env
): Promise<void> {
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'userId' && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }
    
    updateValues.push(memoryId, userId);
    
    const query = `
      UPDATE email_memories 
      SET ${updateFields.join(', ')} 
      WHERE id = ? AND userId = ?
    `;
    
    const result = await env.DB.prepare(query).bind(...updateValues).run();
    
    if (!result.meta || result.meta.changes === 0) {
      throw new Error(`Email memory with ID ${memoryId} not found`);
    }
    
    console.log(`Email memory ${memoryId} updated in D1`);
  } catch (error) {
    console.error("Error updating email memory in D1:", error);
    throw error;
  }
}
/**
 * Add relationship between emails
 */
export async function addEmailRelationship(
  emailId: string,
  relatedEmailId: string,
  relationshipType: string,
  env: Env
): Promise<void> {
  try {
    const relationshipId = uuidv4();
    await env.DB.prepare(`
      INSERT INTO email_relationships (id, email_id, related_email_id, relationship_type)
      VALUES (?, ?, ?, ?)
    `).bind(relationshipId, emailId, relatedEmailId, relationshipType).run();
    
    console.log(`Email relationship created between ${emailId} and ${relatedEmailId}`);
  } catch (error) {
    console.error("Error creating email relationship:", error);
    throw error;
  }
}

/**
 * Get related emails
 */
export async function getRelatedEmails(
  emailId: string,
  env: Env
): Promise<EmailMemory[]> {
  try {
    const result = await env.DB.prepare(`
      SELECT em.* FROM email_memories em
      JOIN email_relationships er ON em.id = er.related_email_id
      WHERE er.email_id = ?
      ORDER BY em.dateSent DESC
    `).bind(emailId).all();

    return result.results as unknown as EmailMemory[];
  } catch (error) {
    console.error("Error retrieving related emails:", error);
    throw error;
  }
}

// Backward compatibility aliases
export const getAllMemoriesFromD1 = getAllEmailMemoriesFromD1;
export const deleteMemoryFromD1 = deleteEmailMemoryFromD1;
export const updateMemoryInD1 = async (
  memoryId: string, 
  userId: string, 
  newContent: string, 
  env: Env
) => {
  return updateEmailMemoryInD1(memoryId, userId, { body: newContent }, env);
};

/**
 * Analyze email patterns and suggest thread groupings
 */
export async function analyzeEmailThreads(
  userId: string,
  env: Env
): Promise<Map<string, EmailMemory[]>> {
  try {
    const emails = await getAllEmailMemoriesFromD1(userId, env);
    const threadMap = new Map<string, EmailMemory[]>();
    
    // Group by existing thread IDs
    emails.forEach(email => {
      if (email.threadId) {
        if (!threadMap.has(email.threadId)) {
          threadMap.set(email.threadId, []);
        }
        threadMap.get(email.threadId)!.push(email);
      }
    });
    
    // Analyze subject patterns for ungrouped emails
    const ungroupedEmails = emails.filter(e => !e.threadId);
    ungroupedEmails.forEach(email => {
      const cleanSubject = email.subject
        ?.replace(/^(Re:|Fwd:|Fw:)\s*/gi, '')
        .trim() || '';
      
      if (cleanSubject) {
        const potentialThreadId = `thread_${cleanSubject.toLowerCase().replace(/\s+/g, '_')}`;
        if (!threadMap.has(potentialThreadId)) {
          threadMap.set(potentialThreadId, []);
        }
        threadMap.get(potentialThreadId)!.push(email);
      }
    });
    
    return threadMap;
  } catch (error) {
    console.error("Error analyzing email threads:", error);
    throw error;
  }
}