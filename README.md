# Email Memory MCP with Gemini AI

A production-ready Model Context Protocol (MCP) server for email memory management using Cloudflare Workers, D1 database, Vectorize for semantic search, and Google Gemini AI for advanced reasoning and embeddings.

## Features

### Email Management with Gemini AI
- **Full Email Ingestion**: Store complete email metadata with Gemini-powered embeddings
- **Thread Management**: Automatically group emails into threads and conversations
- **Relationship Tracking**: Link related emails across different threads
- **Advanced Semantic Search**: Gemini embeddings for superior context understanding
- **AI-Powered Analysis**: Content analysis, sentiment detection, entity extraction
- **Intelligent Summarization**: Multi-email summarization and pattern identification
- **Automated Relationship Suggestions**: AI-suggested email relationships

### Enhanced MCP Tools with Gemini AI

#### Core Email Tools
1. **`ingestEmail`** - Store emails with Gemini embeddings
2. **`searchEmailMemory`** - Advanced semantic search using Gemini
3. **`getEmailsBySender`** - Retrieve communication history by sender
4. **`getEmailThread`** - Get complete conversation threads
5. **`findSimilarEmails`** - Content similarity using Gemini embeddings
6. **`linkRelatedEmails`** - Manually create email relationships

#### AI-Powered Analysis Tools
7. **`analyzeEmailWithAI`** - Comprehensive email analysis using Gemini
   - Topic extraction and categorization
   - Sentiment analysis and tone detection
   - Entity recognition (people, organizations, dates)
   - Action item identification
   - Context and implications analysis

8. **`summarizeEmailsWithAI`** - Multi-email summarization
   - Executive summaries of email collections
   - Pattern and theme identification
   - Communication trend analysis
   - Action item aggregation

9. **`suggestEmailRelationships`** - AI-powered relationship detection
   - Content-based relationship suggestions
   - Context-aware thread grouping
   - Confidence scoring for suggestions

10. **`analyzeEmailPatterns`** - Pattern analysis and insights

### Backward Compatibility
- **`addToMCPMemory`** - General memory storage with Gemini embeddings
- **`searchMCPMemory`** - General memory search using Gemini

## Architecture

### Gemini AI Integration
- **Embeddings**: Text-embedding-004 model for superior semantic understanding
- **Reasoning**: Gemini-2.5-pro for advanced analysis and insights
- **Safety Settings**: All safety restrictions disabled for maximum capability
- **Thinking Mode**: Advanced reasoning with thinking budget controls

### Database Schema (D1)
- **email_memories** table:
  - Full email metadata storage
  - Indexed for fast retrieval by sender, thread, and date
  - Support for conversation grouping

- **email_relationships** table:
  - Track relationships between emails
  - Support custom relationship types

### Vector Storage (Vectorize)
- Gemini-powered semantic embeddings
- Enhanced metadata storage with AI insights
- Namespace isolation per user
- Superior similarity search accuracy

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/)
   - Update `wrangler.jsonc` with your API key:
   ```jsonc
   "vars": {
     "GEMINI_API_KEY": "your-actual-gemini-api-key"
   }
   ```
   - Update D1 database and Vectorize index IDs

3. **Deploy**:
   ```bash
   npm run deploy
   ```

## Configuration

### Gemini AI Settings
- **Model**: Gemini-2.5-pro for reasoning, text-embedding-004 for embeddings
- **Safety Settings**: All categories set to BLOCK_NONE for unrestricted analysis
- **Thinking Mode**: Enabled with comprehensive reasoning capabilities
- **System Instructions**: Complete database schema knowledge for accurate retrieval

### Environment Variables
```jsonc
{
  "vars": {
    "GEMINI_API_KEY": "your-gemini-api-key"
  }
}
```

## API Endpoints

### Enhanced Email Endpoints
- `GET /emails` - Get all emails with Gemini metadata
- `GET /emails/sender/:senderEmail` - Get emails by sender
- `GET /emails/thread/:threadId` - Get email thread
- `POST /emails/daterange` - Get emails by date range
- `GET /emails/:emailId/related` - Get AI-suggested related emails
- `DELETE /emails/:emailId` - Delete email and embeddings
- `PUT /emails/:emailId` - Update email with re-embedding

### Legacy Endpoints (backward compatibility)
- `GET /memories` - Get all memories
- `DELETE /memories/:memoryId` - Delete a memory
- `PUT /memories/:memoryId` - Update a memory

## Usage Examples

### Basic Email Operations
```javascript
// Ingest email with Gemini embeddings
await mcp.ingestEmail({
  senderEmail: "john@example.com",
  senderName: "John Doe",
  subject: "Project Update",
  body: "Here's the latest update on our project...",
  attachments: "project_plan.pdf,budget.xlsx",
  dateSent: "2024-01-15T10:30:00Z",
  threadId: "thread_project_update"
});

// Advanced semantic search
await mcp.searchEmailMemory({
  query: "urgent budget concerns about Q4 projections",
  senderEmail: "finance@company.com",
  hasAttachments: true
});
```

### AI-Powered Analysis
```javascript
// Analyze email content with Gemini
await mcp.analyzeEmailWithAI({
  emailId: "email-123",
  analysisType: "comprehensive"
});

// Summarize email thread
await mcp.summarizeEmailsWithAI({
  threadId: "project_discussion",
  limit: 15
});

// Get AI relationship suggestions
await mcp.suggestEmailRelationships({
  limit: 25
});
```

## Performance Optimizations

### Gemini Integration
- Optimized embedding generation with batching
- Efficient token usage with content summarization
- Advanced caching strategies for repeated queries
- Thinking budget optimization for complex analysis

### Database & Vectorization
- Indexed database fields for fast queries
- Namespace isolation for multi-tenant support
- Configurable similarity thresholds
- Batch operations for bulk processing

## Advanced Features

### AI Capabilities
- **Content Analysis**: Topic extraction, sentiment analysis, entity recognition
- **Pattern Recognition**: Communication patterns, thread identification
- **Relationship Mapping**: Automatic and manual email relationship tracking
- **Intelligent Search**: Context-aware semantic search with Gemini embeddings
- **Summarization**: Multi-email summarization with key insights

### Security & Safety
- **API Key Management**: Secure Gemini API key handling
- **Safety Override**: All safety settings disabled for unrestricted analysis
- **User Isolation**: Single-user deployment with namespace isolation
- **Rate Limiting**: Configurable rate limits via Cloudflare

## Development

```bash
# Run locally with Gemini integration
npm run dev

# Format code
npm run format

# Lint code
npm run lint:fix

# Generate types
npm run cf-typegen

# Database migration
npm run migrate
```

## Migration from Cloudflare AI

This version replaces Cloudflare AI with Google Gemini for:
- ✅ Superior embedding quality with text-embedding-004
- ✅ Advanced reasoning capabilities with Gemini-2.5-pro
- ✅ Comprehensive system instructions with database schema knowledge
- ✅ Disabled safety settings for unrestricted analysis
- ✅ Enhanced AI analysis and summarization tools
- ✅ Backward compatibility with existing data

### Key Improvements
- **Better Search Accuracy**: Gemini embeddings provide superior semantic understanding
- **AI-Powered Insights**: Comprehensive email analysis and pattern recognition
- **Advanced Reasoning**: Complex query understanding and relationship suggestions
- **Enhanced Summarization**: Multi-email summarization with actionable insights

## Troubleshooting

### Common Issues
1. **API Key**: Ensure `GEMINI_API_KEY` is properly set in wrangler.jsonc
2. **Rate Limits**: Gemini API has usage limits - monitor consumption
3. **Token Limits**: Long emails may need truncation for embedding
4. **Safety Settings**: Verify safety settings are properly disabled

## License

MIT

---

**Powered by Google Gemini AI for superior email memory management and analysis.**
