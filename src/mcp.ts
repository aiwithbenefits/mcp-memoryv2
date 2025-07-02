import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { 
  storeEmailMemoryInD1, 
  getAllEmailMemoriesFromD1,
  getEmailsBySender,
  getEmailsByThread,
  getEmailsByDateRange,
  analyzeEmailThreads,
  addEmailRelationship
} from "./utils/db";
import { 
  storeEmailMemory, 
  searchEmailMemories,
  findSimilarEmails,
  analyzeEmailWithGemini
} from "./utils/vectorize";
import { createGeminiService } from "./utils/gemini";
import { version } from "../package.json";

type MyMCPProps = {
  userId: string;
};

export class MyMCP extends McpAgent<Env, {}, MyMCPProps> {
  server = new McpServer({
    name: "Email Memory MCP with Gemini AI",
    version,
  });

  async init() {
    const env = this.env as Env;

    // Email ingestion tool
    this.server.tool(
      "ingestEmail",
      `Stores a new email in the memory system using Gemini embeddings. Use this when an email is received to capture all relevant metadata and content for future retrieval and analysis.`,
      {
        senderEmail: z.string().describe("Email address of the sender"),
        senderName: z.string().optional().describe("Name of the sender"),
        subject: z.string().optional().describe("Email subject line"),
        body: z.string().describe("Email body content"),
        attachments: z.string().optional().describe("Comma-separated list of attachment filenames"),
        dateSent: z.string().describe("ISO date string of when email was sent"),
        threadId: z.string().optional().describe("Thread ID for conversation grouping"),
        conversationId: z.string().optional().describe("Conversation ID for broader context")
      },
      async (emailData) => {
        try {
          // Store in Vectorize with Gemini embeddings and enhanced metadata
          const memoryId = await storeEmailMemory(
            {
              content: emailData.body,
              senderEmail: emailData.senderEmail,
              senderName: emailData.senderName,
              subject: emailData.subject,
              dateSent: emailData.dateSent,
              threadId: emailData.threadId,
              conversationId: emailData.conversationId,
              attachments: emailData.attachments,
              emailType: 'inbound'
            },
            this.props.userId,
            env
          );

          // Store in D1 database
          await storeEmailMemoryInD1(
            {
              userId: this.props.userId,
              senderEmail: emailData.senderEmail,
              senderName: emailData.senderName || '',
              subject: emailData.subject || '',
              body: emailData.body,
              attachments: emailData.attachments || '',
              dateSent: emailData.dateSent,
              threadId: emailData.threadId,
              conversationId: emailData.conversationId
            },
            env,
            memoryId
          );

          console.log(`Email ingested successfully with Gemini embeddings. ID: ${memoryId}`);

          return {
            content: [{
              type: "text",
              text: `Email stored successfully with Gemini AI embeddings:\nFrom: ${emailData.senderName || emailData.senderEmail}\nSubject: ${emailData.subject || '(no subject)'}\nDate: ${emailData.dateSent}\nID: ${memoryId}`
            }],
          };
        } catch (error) {
          console.error("Error ingesting email:", error);
          return {
            content: [{ type: "text", text: "Failed to ingest email: " + String(error) }],
          };
        }
      }
    );

    // Enhanced email search tool with Gemini
    this.server.tool(
      "searchEmailMemory",
      `Searches stored emails using Gemini's advanced semantic search with optional filters. This tool understands context and can find emails even when exact keywords don't match.`,
      {
        query: z.string().describe("Search query - can be natural language"),
        senderEmail: z.string().optional().describe("Filter by specific sender email"),
        startDate: z.string().optional().describe("Start date for date range filter (ISO format)"),
        endDate: z.string().optional().describe("End date for date range filter (ISO format)"),
        threadId: z.string().optional().describe("Filter by specific thread ID"),
        hasAttachments: z.boolean().optional().describe("Filter for emails with attachments")
      },
      async (searchParams) => {
        try {
          console.log(`Searching emails with Gemini embeddings for query: "${searchParams.query}"`);

          const filters: any = {};
          if (searchParams.senderEmail) filters.senderEmail = searchParams.senderEmail;
          if (searchParams.startDate && searchParams.endDate) {
            filters.dateRange = { start: searchParams.startDate, end: searchParams.endDate };
          }
          if (searchParams.threadId) filters.threadId = searchParams.threadId;
          if (searchParams.hasAttachments !== undefined) filters.hasAttachments = searchParams.hasAttachments;

          const memories = await searchEmailMemories(
            searchParams.query,
            this.props.userId,
            env,
            filters
          );

          console.log(`Gemini search returned ${memories.length} matches`);

          if (memories.length > 0) {
            const results = memories.map(m => {
              const meta = m.metadata;
              return `From: ${meta.senderName || meta.senderEmail} <${meta.senderEmail}>
Subject: ${meta.subject || '(no subject)'}
Date: ${meta.dateSent}
Relevance: ${(m.score * 100).toFixed(1)}%
---
${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`;
            }).join('\n\n');

            return {
              content: [{
                type: "text",
                text: `Found ${memories.length} emails using Gemini AI search:\n\n${results}`
              }],
            };
          }

          return {
            content: [{ type: "text", text: "No emails found matching your search criteria." }],
          };
        } catch (error) {
          console.error("Error searching emails with Gemini:", error);
          return {
            content: [{ type: "text", text: "Failed to search emails: " + String(error) }],
          };
        }
      }
    );

    // AI-powered email analysis tool
    this.server.tool(
      "analyzeEmailWithAI",
      `Uses Gemini AI to analyze email content and extract insights including topics, sentiment, entities, and action items.`,
      {
        emailId: z.string().optional().describe("ID of specific email to analyze"),
        emailContent: z.string().optional().describe("Email content to analyze directly"),
        analysisType: z.string().optional().default("comprehensive").describe("Type of analysis: comprehensive, sentiment, topics, entities, actions")
      },
      async ({ emailId, emailContent, analysisType }) => {
        try {
          let contentToAnalyze = emailContent;
          
          if (emailId && !emailContent) {
            // Fetch email content from database
            const emails = await getAllEmailMemoriesFromD1(this.props.userId, env);
            const email = emails.find(e => e.id === emailId);
            if (!email) {
              return {
                content: [{ type: "text", text: `Email with ID ${emailId} not found.` }],
              };
            }
            contentToAnalyze = email.body;
          }
          
          if (!contentToAnalyze) {
            return {
              content: [{ type: "text", text: "No email content provided for analysis." }],
            };
          }

          const geminiService = createGeminiService(env);
          const analysis = await geminiService.analyzeEmailContent(contentToAnalyze, analysisType);

          return {
            content: [{
              type: "text",
              text: `Gemini AI Analysis (${analysisType}):\n\n${analysis}`
            }],
          };
        } catch (error) {
          console.error("Error analyzing email with Gemini:", error);
          return {
            content: [{ type: "text", text: "Failed to analyze email: " + String(error) }],
          };
        }
      }
    );

    // AI-powered email summarization tool
    this.server.tool(
      "summarizeEmailsWithAI",
      `Uses Gemini AI to summarize multiple emails and identify patterns, themes, and insights.`,
      {
        senderEmail: z.string().optional().describe("Summarize emails from specific sender"),
        threadId: z.string().optional().describe("Summarize emails from specific thread"),
        startDate: z.string().optional().describe("Start date for date range"),
        endDate: z.string().optional().describe("End date for date range"),
        limit: z.number().optional().default(10).describe("Maximum number of emails to include")
      },
      async ({ senderEmail, threadId, startDate, endDate, limit }) => {
        try {
          let emails;
          
          if (senderEmail) {
            emails = await getEmailsBySender(this.props.userId, senderEmail, env);
          } else if (threadId) {
            emails = await getEmailsByThread(this.props.userId, threadId, env);
          } else if (startDate && endDate) {
            emails = await getEmailsByDateRange(this.props.userId, startDate, endDate, env);
          } else {
            emails = await getAllEmailMemoriesFromD1(this.props.userId, env);
          }
          
          if (emails.length === 0) {
            return {
              content: [{ type: "text", text: "No emails found for summarization." }],
            };
          }
          
          // Limit emails for processing
          const emailsToSummarize = emails.slice(0, limit).map(email => ({
            subject: email.subject,
            body: email.body,
            sender: email.senderName || email.senderEmail,
            date: email.dateSent
          }));

          const geminiService = createGeminiService(env);
          const summary = await geminiService.summarizeEmails(emailsToSummarize);

          return {
            content: [{
              type: "text", 
              text: `Gemini AI Summary of ${emailsToSummarize.length} emails:\n\n${summary}`
            }],
          };
        } catch (error) {
          console.error("Error summarizing emails with Gemini:", error);
          return {
            content: [{ type: "text", text: "Failed to summarize emails: " + String(error) }],
          };
        }
      }
    );

    // AI-powered relationship suggestions
    this.server.tool(
      "suggestEmailRelationships",
      `Uses Gemini AI to analyze emails and suggest relationships between them based on content, context, and patterns.`,
      {
        limit: z.number().optional().default(20).describe("Maximum number of emails to analyze for relationships")
      },
      async ({ limit }) => {
        try {
          const emails = await getAllEmailMemoriesFromD1(this.props.userId, env);
          
          if (emails.length < 2) {
            return {
              content: [{ type: "text", text: "Need at least 2 emails to suggest relationships." }],
            };
          }
          
          const emailsToAnalyze = emails.slice(0, limit).map(email => ({
            id: email.id,
            subject: email.subject,
            body: email.body,
            sender: email.senderName || email.senderEmail
          }));

          const geminiService = createGeminiService(env);
          const suggestions = await geminiService.suggestEmailRelationships(emailsToAnalyze);
          
          if (suggestions.length === 0) {
            return {
              content: [{ type: "text", text: "No strong relationships found between emails." }],
            };
          }

          const formattedSuggestions = suggestions.map(s => 
            `Emails: ${s.email1} ↔ ${s.email2}\nRelationship: ${s.relationship}\nConfidence: ${(s.confidence * 100).toFixed(1)}%`
          ).join('\n\n');

          return {
            content: [{
              type: "text",
              text: `Gemini AI suggested ${suggestions.length} email relationships:\n\n${formattedSuggestions}`
            }],
          };
        } catch (error) {
          console.error("Error suggesting relationships with Gemini:", error);
          return {
            content: [{ type: "text", text: "Failed to suggest relationships: " + String(error) }],
          };
        }
      }
    );

    // Get emails by sender tool
    this.server.tool(
      "getEmailsBySender",
      `Retrieves all emails from a specific sender. Useful for reviewing communication history with a particular person or organization.`,
      {
        senderEmail: z.string().describe("Email address of the sender to search for")
      },
      async ({ senderEmail }) => {
        try {
          const emails = await getEmailsBySender(this.props.userId, senderEmail, env);
          
          if (emails.length === 0) {
            return {
              content: [{ type: "text", text: `No emails found from ${senderEmail}` }],
            };
          }

          const summary = emails.map(e => 
            `Subject: ${e.subject || '(no subject)'}\nDate: ${e.dateSent}\n${e.body.substring(0, 100)}...`
          ).join('\n---\n');

          return {
            content: [{
              type: "text",
              text: `Found ${emails.length} emails from ${senderEmail}:\n\n${summary}`
            }],
          };
        } catch (error) {
          console.error("Error getting emails by sender:", error);
          return {
            content: [{ type: "text", text: "Failed to retrieve emails: " + String(error) }],
          };
        }
      }
    );

    // Get email thread tool
    this.server.tool(
      "getEmailThread",
      `Retrieves all emails in a specific thread/conversation. Shows the full context of an email exchange.`,
      {
        threadId: z.string().describe("Thread ID to retrieve")
      },
      async ({ threadId }) => {
        try {
          const emails = await getEmailsByThread(this.props.userId, threadId, env);
          
          if (emails.length === 0) {
            return {
              content: [{ type: "text", text: `No emails found in thread ${threadId}` }],
            };
          }

          const thread = emails.map(e => 
            `From: ${e.senderName || e.senderEmail}\nDate: ${e.dateSent}\nSubject: ${e.subject || '(no subject)'}\n\n${e.body}`
          ).join('\n\n========================================\n\n');

          return {
            content: [{
              type: "text",
              text: `Thread ${threadId} contains ${emails.length} emails:\n\n${thread}`
            }],
          };
        } catch (error) {
          console.error("Error getting email thread:", error);
          return {
            content: [{ type: "text", text: "Failed to retrieve thread: " + String(error) }],
          };
        }
      }
    );

    // Analyze email patterns tool
    this.server.tool(
      "analyzeEmailPatterns",
      `Analyzes email patterns to identify threads, conversation groups, and relationships between emails.`,
      {},
      async () => {
        try {
          const threadMap = await analyzeEmailThreads(this.props.userId, env);
          
          const analysis = Array.from(threadMap.entries()).map(([threadId, emails]) => {
            const subjects = [...new Set(emails.map(e => e.subject || '(no subject)'))];
            const senders = [...new Set(emails.map(e => e.senderEmail))];
            
            return `Thread: ${threadId}
Emails: ${emails.length}
Subjects: ${subjects.join(', ')}
Senders: ${senders.join(', ')}
Date range: ${emails[emails.length-1].dateSent} to ${emails[0].dateSent}`;
          }).join('\n\n');

          return {
            content: [{
              type: "text",
              text: `Email pattern analysis:\n\n${analysis}\n\nTotal threads identified: ${threadMap.size}`
            }],
          };
        } catch (error) {
          console.error("Error analyzing email patterns:", error);
          return {
            content: [{ type: "text", text: "Failed to analyze patterns: " + String(error) }],
          };
        }
      }
    );

    // Find similar emails tool
    this.server.tool(
      "findSimilarEmails",
      `Finds emails similar to a given email using Gemini embeddings based on content, context, and metadata. Useful for finding related communications.`,
      {
        emailId: z.string().describe("ID of the email to find similar emails for"),
        limit: z.number().optional().default(5).describe("Maximum number of similar emails to return")
      },
      async ({ emailId, limit }) => {
        try {
          const similarEmails = await findSimilarEmails(emailId, this.props.userId, env, limit);
          
          if (similarEmails.length === 0) {
            return {
              content: [{ type: "text", text: "No similar emails found." }],
            };
          }

          const results = similarEmails.map(e => {
            const meta = e.metadata;
            return `Similarity: ${(e.score * 100).toFixed(1)}%
From: ${meta.senderName || meta.senderEmail}
Subject: ${meta.subject || '(no subject)'}
Date: ${meta.dateSent}
ID: ${e.id}`;
          }).join('\n\n');

          return {
            content: [{
              type: "text",
              text: `Found ${similarEmails.length} similar emails using Gemini embeddings:\n\n${results}`
            }],
          };
        } catch (error) {
          console.error("Error finding similar emails:", error);
          return {
            content: [{ type: "text", text: "Failed to find similar emails: " + String(error) }],
          };
        }
      }
    );

    // Create email relationship tool
    this.server.tool(
      "linkRelatedEmails",
      `Creates a relationship between two emails. Use this to manually link emails that are related but not in the same thread.`,
      {
        emailId1: z.string().describe("First email ID"),
        emailId2: z.string().describe("Second email ID"),
        relationshipType: z.string().describe("Type of relationship (e.g., 'follow-up', 'reference', 'related-topic')")
      },
      async ({ emailId1, emailId2, relationshipType }) => {
        try {
          await addEmailRelationship(emailId1, emailId2, relationshipType, env);
          
          return {
            content: [{
              type: "text",
              text: `Successfully linked emails ${emailId1} and ${emailId2} with relationship: ${relationshipType}`
            }],
          };
        } catch (error) {
          console.error("Error creating email relationship:", error);
          return {
            content: [{ type: "text", text: "Failed to link emails: " + String(error) }],
          };
        }
      }
    );

    // Backward compatibility - enhanced memory addition tool
    this.server.tool(
      "addToMCPMemory",
      `Stores important information in memory using Gemini embeddings. For emails, use ingestEmail instead. This tool is for general notes and information.`,
      { thingToRemember: z.string().describe("Information to remember") },
      async ({ thingToRemember }) => {
        try {
          // Store as a note-type email for backward compatibility
          const memoryId = await storeEmailMemory(
            {
              content: thingToRemember,
              senderEmail: 'notes@system.internal',
              senderName: 'Personal Notes',
              subject: 'Memory Note',
              dateSent: new Date().toISOString(),
              emailType: 'note'
            },
            this.props.userId,
            env
          );

          await storeEmailMemoryInD1(
            {
              userId: this.props.userId,
              senderEmail: 'notes@system.internal',
              senderName: 'Personal Notes',
              subject: 'Memory Note',
              body: thingToRemember,
              attachments: '',
              dateSent: new Date().toISOString()
            },
            env,
            memoryId
          );

          return {
            content: [{ type: "text", text: "Remembered with Gemini embeddings: " + thingToRemember }],
          };
        } catch (error) {
          console.error("Error storing memory:", error);
          return {
            content: [{ type: "text", text: "Failed to remember: " + String(error) }],
          };
        }
      }
    );

    // Backward compatibility - search tool
    this.server.tool(
      "searchMCPMemory",
      `Searches all stored information using Gemini embeddings including emails and notes. For email-specific searches, use searchEmailMemory for better results.`,
      { informationToGet: z.string().describe("What to search for") },
      async ({ informationToGet }) => {
        try {
          const memories = await searchEmailMemories(informationToGet, this.props.userId, env);
          
          if (memories.length > 0) {
            const results = memories.map(m => {
              const meta = m.metadata;
              if (meta.emailType === 'note' || meta.senderEmail === 'notes@system.internal') {
                return `${m.content} (relevance: ${(m.score * 100).toFixed(1)}%)`;
              } else {
                return `Email from ${meta.senderName || meta.senderEmail}: ${meta.subject || '(no subject)'}\n${m.content.substring(0, 100)}... (relevance: ${(m.score * 100).toFixed(1)}%)`;
              }
            }).join('\n\n');

            return {
              content: [{
                type: "text",
                text: `Found memories using Gemini search:\n${results}`
              }],
            };
          }

          return {
            content: [{ type: "text", text: "No relevant memories found." }],
          };
        } catch (error) {
          console.error("Error searching memories:", error);
          return {
            content: [{ type: "text", text: "Failed to search memories: " + String(error) }],
          };
        }
      }
    );
  }
}
