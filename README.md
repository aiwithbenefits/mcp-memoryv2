# Email Memory MCP

A production-ready Model Context Protocol (MCP) server for email memory management using Cloudflare Workers, D1 database, and Vectorize for semantic search.

## Features

### Email Management
- **Full Email Ingestion**: Store complete email metadata including sender, subject, body, attachments, and timestamps
- **Thread Management**: Automatically group emails into threads and conversations
- **Relationship Tracking**: Link related emails across different threads
- **Advanced Search**: Semantic search with filters for sender, date range, threads, and attachments

### MCP Tools Available

1. **`ingestEmail`** - Store new emails with full metadata
   - Captures sender email/name, subject, body, attachments, date sent
   - Supports thread and conversation IDs for grouping
   - Automatically generates vector embeddings for semantic search

2. **`searchEmailMemory`** - Advanced email search with filters
   - Natural language queries with semantic understanding
   - Filter by sender, date range, thread, or attachment presence
   - Returns relevance scores for each result

3. **`getEmailsBySender`** - Retrieve all emails from a specific sender
   - Quick access to communication history
   - Chronologically ordered results

4. **`getEmailThread`** - Get all emails in a conversation thread
   - View complete email exchanges
   - Maintains conversation context

5. **`analyzeEmailPatterns`** - Analyze email patterns and relationships
   - Identify conversation threads
   - Group related emails
   - Analyze communication patterns

6. **`findSimilarEmails`** - Find emails similar to a given email
   - Uses vector similarity for content matching
   - Helps identify related communications

7. **`linkRelatedEmails`** - Manually link related emails
   - Create custom relationships between emails
   - Support for follow-ups, references, and related topics

### Backward Compatibility
- **`addToMCPMemory`** - General memory storage (legacy support)
- **`searchMCPMemory`** - General memory search (legacy support)

## Architecture

### Database Schema (D1)
- **email_memories** table:
  - Full email metadata storage
  - Indexed for fast retrieval by sender, thread, and date
  - Support for conversation grouping

- **email_relationships** table:
  - Track relationships between emails
  - Support custom relationship types

### Vector Storage (Vectorize)
- Semantic embeddings for email content
- Enhanced metadata storage
- Namespace isolation per user
- Fast similarity search

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Cloudflare**:
   - Update `wrangler.jsonc` with your D1 database and Vectorize index IDs
   - Ensure AI binding is configured for embeddings

3. **Deploy**:
   ```bash
   npm run deploy
   ```

## API Endpoints

### Email Endpoints
- `GET /emails` - Get all emails
- `GET /emails/sender/:senderEmail` - Get emails by sender
- `GET /emails/thread/:threadId` - Get email thread
- `POST /emails/daterange` - Get emails by date range
- `GET /emails/:emailId/related` - Get related emails
- `DELETE /emails/:emailId` - Delete an email
- `PUT /emails/:emailId` - Update an email

### Legacy Endpoints (backward compatibility)
- `GET /memories` - Get all memories
- `DELETE /memories/:memoryId` - Delete a memory
- `PUT /memories/:memoryId` - Update a memory

## Usage Example

```javascript
// Ingest a new email
await mcp.ingestEmail({
  senderEmail: "john@example.com",
  senderName: "John Doe",
  subject: "Project Update",
  body: "Here's the latest update on our project...",
  attachments: "project_plan.pdf,budget.xlsx",
  dateSent: "2024-01-15T10:30:00Z",
  threadId: "thread_project_update"
});

// Search emails with filters
await mcp.searchEmailMemory({
  query: "project budget",
  senderEmail: "john@example.com",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  hasAttachments: true
});

// Analyze email patterns
await mcp.analyzeEmailPatterns();
```

## Performance Optimizations

- Indexed database fields for fast queries
- Efficient vector embeddings using Cloudflare AI
- Namespace isolation for multi-tenant support
- Configurable similarity thresholds
- Batch operations support

## Security

- Single-user deployment with fixed user ID
- All data isolated by user namespace
- Secure vector storage with Cloudflare Vectorize
- Rate limiting support via Cloudflare

## Development

```bash
# Run locally
npm run dev

# Format code
npm run format

# Lint code
npm run lint:fix

# Generate types
npm run cf-typegen
```

## License

MIT