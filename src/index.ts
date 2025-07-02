import { Hono } from "hono";
import { MyMCP } from "./mcp";
import { 
  getAllEmailMemoriesFromD1, 
  initializeDatabase, 
  deleteEmailMemoryFromD1, 
  updateEmailMemoryInD1,
  getEmailsBySender,
  getEmailsByThread,
  getEmailsByDateRange,
  getRelatedEmails
} from "./utils/db";
import { deleteVectorById, updateEmailMemoryVector } from "./utils/vectorize";

const app = new Hono<{
  Bindings: Env;
}>();

// Initialize database once
let dbInitialized = false;

// Middleware for one-time database initialization
app.use("*", async (c, next) => {
  if (!dbInitialized) {
    try {
      console.log("Attempting database initialization...");
      await initializeDatabase(c.env);
      dbInitialized = true;
      console.log("Database initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize D1 database:", e);
    }
  }
  await next();
});

// index.html
app.get("/", async (c) => await c.env.ASSETS.fetch(c.req.raw));

// Get all email memories for the single user
app.get("/emails", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";

  try {
    const emails = await getAllEmailMemoriesFromD1(userId, c.env);
    return c.json({ success: true, emails });
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return c.json({ success: false, error: "Failed to retrieve emails" }, 500);
  }
});

// Get emails by sender
app.get("/emails/sender/:senderEmail", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  const senderEmail = c.req.param("senderEmail");

  try {
    const emails = await getEmailsBySender(userId, senderEmail, c.env);
    return c.json({ success: true, emails });
  } catch (error) {
    console.error("Error retrieving emails by sender:", error);
    return c.json({ success: false, error: "Failed to retrieve emails" }, 500);
  }
});

// Get emails by thread
app.get("/emails/thread/:threadId", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  const threadId = c.req.param("threadId");

  try {
    const emails = await getEmailsByThread(userId, threadId, c.env);
    return c.json({ success: true, emails });
  } catch (error) {
    console.error("Error retrieving thread:", error);
    return c.json({ success: false, error: "Failed to retrieve thread" }, 500);
  }
});

// Get emails by date range
app.post("/emails/daterange", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  
  try {
    const body = await c.req.json();
    const { startDate, endDate } = body;
    
    if (!startDate || !endDate) {
      return c.json({ success: false, error: "Start and end dates required" }, 400);
    }
    
    const emails = await getEmailsByDateRange(userId, startDate, endDate, c.env);
    return c.json({ success: true, emails });
  } catch (error) {
    console.error("Error retrieving emails by date:", error);
    return c.json({ success: false, error: "Failed to retrieve emails" }, 500);
  }
});

// Get related emails
app.get("/emails/:emailId/related", async (c) => {
  const emailId = c.req.param("emailId");

  try {
    const relatedEmails = await getRelatedEmails(emailId, c.env);
    return c.json({ success: true, relatedEmails });
  } catch (error) {
    console.error("Error retrieving related emails:", error);
    return c.json({ success: false, error: "Failed to retrieve related emails" }, 500);
  }
});

// Delete an email memory
app.delete("/emails/:emailId", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  const emailId = c.req.param("emailId");

  try {
    // Delete from D1
    await deleteEmailMemoryFromD1(emailId, userId, c.env);
    console.log(`Deleted email ${emailId} from D1.`);

    // Delete from Vectorize
    try {
      await deleteVectorById(emailId, userId, c.env);
      console.log(`Deleted vector ${emailId} from Vectorize.`);
    } catch (vectorError) {
      console.error(`Failed to delete vector ${emailId}:`, vectorError);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(`Error deleting email ${emailId}:`, error);
    return c.json({ success: false, error: "Failed to delete email" }, 500);
  }
});

// Update an email memory
app.put("/emails/:emailId", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  const emailId = c.req.param("emailId");

  try {
    const body = await c.req.json();
    
    // Update in D1
    await updateEmailMemoryInD1(emailId, userId, body, c.env);
    console.log(`Updated email ${emailId} in D1.`);

    // Update vector in Vectorize
    try {
      await updateEmailMemoryVector(emailId, body, userId, c.env);
      console.log(`Updated vector ${emailId} in Vectorize.`);
    } catch (vectorError) {
      console.error(`Failed to update vector ${emailId}:`, vectorError);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating email ${emailId}:`, error);
    const errorMessage = error.message || "Failed to update email";
    if (errorMessage.includes("not found")) {
      return c.json({ success: false, error: errorMessage }, 404);
    }
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Backward compatibility endpoints
app.get("/memories", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  
  try {
    const emails = await getAllEmailMemoriesFromD1(userId, c.env);
    // Convert to legacy format
    const memories = emails.map(e => ({
      id: e.id,
      content: e.body
    }));
    return c.json({ success: true, memories });
  } catch (error) {
    console.error("Error retrieving memories:", error);
    return c.json({ success: false, error: "Failed to retrieve memories" }, 500);
  }
});

app.delete("/memories/:memoryId", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  const memoryId = c.req.param("memoryId");
  
  try {
    await deleteEmailMemoryFromD1(memoryId, userId, c.env);
    await deleteVectorById(memoryId, userId, c.env);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return c.json({ success: false, error: "Failed to delete memory" }, 500);
  }
});

app.put("/memories/:memoryId", async (c) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  const memoryId = c.req.param("memoryId");
  
  try {
    const body = await c.req.json();
    const updatedContent = body.content;
    
    await updateEmailMemoryInD1(memoryId, userId, { body: updatedContent }, c.env);
    await updateEmailMemoryVector(memoryId, { content: updatedContent }, userId, c.env);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating memory:", error);
    return c.json({ success: false, error: "Failed to update memory" }, 500);
  }
});

// Mount MCP agent
app.mount("/", async (req, env, ctx) => {
  const userId = "1bd5a348-e12e-4b07-9cff-43278f2d2c9b";
  
  ctx.props = {
    userId: userId,
  };

  const response = await MyMCP.mount("/sse").fetch(req, env, ctx);

  if (response) {
    return response;
  }

  return new Response("Not Found within MCP mount", { status: 404 });
});

export default app;
export { MyMCP };