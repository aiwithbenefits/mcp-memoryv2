# Email Memory MCP - Quick Start Guide

## Email Integration Setup

### 1. Deploy the Updated Code
```bash
npm install
npm run deploy
```

### 2. Run Database Migration
Execute the migration script to upgrade your database:
```bash
npx wrangler d1 execute mcp-memoryV2 --file=migrate.sql
```

### 3. Configure Your MCP Client
Add the server to your MCP client configuration (see README for client-specific instructions).

### 4. Start Using Email Memory Tools

#### Store an Email
```javascript
// In your MCP client, use the ingestEmail tool:
await mcp.ingestEmail({
  senderEmail: "john@example.com",
  senderName: "John Doe",
  subject: "Project Update",
  body: "Here's the latest update on our project...",
  attachments: "project_plan.pdf,budget.xlsx",
  dateSent: "2024-01-15T10:30:00Z",
  threadId: "thread_project_update"
});
```

#### Search Emails
```javascript
// Natural language search with filters
await mcp.searchEmailMemory({
  query: "budget projections",
  senderEmail: "john@example.com",
  startDate: "2024-01-01",
  endDate: "2024-01-31"
});
```

#### Get Email Thread
```javascript
// View entire conversation
await mcp.getEmailThread({
  threadId: "thread_project_update"
});
```

#### Find Similar Emails
```javascript
// Find related emails by content similarity
await mcp.findSimilarEmails({
  emailId: "email-id-here",
  limit: 5
});
```

## Email Integration Patterns

### 1. Automated Email Ingestion
Set up a webhook or scheduled job to automatically ingest emails:
```javascript
// Example: Process incoming email
async function processIncomingEmail(emailData) {
  await mcp.ingestEmail({
    senderEmail: emailData.from,
    senderName: emailData.fromName,
    subject: emailData.subject,
    body: emailData.body,
    attachments: emailData.attachments.join(','),
    dateSent: emailData.date,
    threadId: emailData.threadId || generateThreadId(emailData.subject)
  });
}
```

### 2. Thread Management
Group related emails automatically:
```javascript
// Example: Generate thread ID from subject
function generateThreadId(subject) {
  // Remove RE:, FW:, etc. and normalize
  const cleanSubject = subject
    .replace(/^(Re:|Fwd:|Fw:)\s*/gi, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  
  return `thread_${cleanSubject}`;
}
```

### 3. Smart Email Analysis
Use the analysis tool to understand communication patterns:
```javascript
// Analyze email patterns
const patterns = await mcp.analyzeEmailPatterns();
// Returns thread groups, sender frequencies, etc.
```

## Best Practices

1. **Thread Consistency**: Use consistent thread IDs for related emails
2. **Metadata Completeness**: Always include sender email and date
3. **Attachment Tracking**: Store attachment names for searchability
4. **Regular Analysis**: Periodically analyze patterns to identify important threads

## Troubleshooting

### Issue: Emails not appearing in search
- Check that dateSent is in ISO format
- Verify sender email is correctly formatted
- Ensure body content is not empty

### Issue: Threads not grouping correctly
- Verify thread IDs are consistent
- Use the analyzeEmailPatterns tool to debug

### Issue: Search not finding relevant emails
- Try broader search terms
- Check date range filters
- Use semantic queries (questions work well)

## Advanced Features

### Custom Relationships
Link emails that aren't in the same thread:
```javascript
await mcp.linkRelatedEmails({
  emailId1: "email-123",
  emailId2: "email-456",
  relationshipType: "follow-up"
});
```

### Semantic Search
The system understands context:
- "emails about the budget" finds budget-related emails
- "messages from last week" understands temporal queries
- "attachments from John" combines sender and attachment filters

## API Reference
See the main README for complete API documentation.