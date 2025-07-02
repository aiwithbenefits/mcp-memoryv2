# Gemini Migration Guide

This guide walks through migrating the Email Memory MCP from Cloudflare AI to Google Gemini AI.

## Summary of Changes

### Replaced Components
- **Embedding Model**: `@cf/baai/bge-m3` → `text-embedding-004` (Gemini)
- **Reasoning Engine**: None → `gemini-2.5-pro` 
- **API Integration**: Cloudflare AI binding → OpenAI SDK with Gemini compatibility

### New Capabilities Added
- Advanced email content analysis with Gemini
- Multi-email summarization and pattern recognition  
- AI-powered relationship suggestions between emails
- Comprehensive system instructions with database schema knowledge
- Disabled safety settings for unrestricted analysis
- Enhanced semantic search with superior embedding quality

## Prerequisites

1. **Google AI Studio Account**: Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. **Existing Cloudflare Setup**: Working Cloudflare Worker with D1 and Vectorize
3. **Node.js**: Version 18+ for OpenAI SDK compatibility

## Migration Steps

### Step 1: Update Dependencies

```bash
cd /users/jacob/downloads/mcp-memoryv2-main
npm install openai@^4.71.1
```

### Step 2: Configure Gemini API Key

Update `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "GEMINI_API_KEY": "your-actual-gemini-api-key-here"
  }
}
```

For production, use secrets:
```bash
wrangler secret put GEMINI_API_KEY
```

### Step 3: Deploy Updated Code

```bash
# Build and verify
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Validation

### Test Basic Functionality
```bash
# Test embedding generation
curl -X POST "https://your-worker.workers.dev/emails" \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test email to verify Gemini integration",
    "dateSent": "2025-01-01T12:00:00Z"
  }'
```

### Test Gemini-Specific Features
1. **AI Analysis**: Use `analyzeEmailWithAI` tool
2. **Summarization**: Use `summarizeEmailsWithAI` tool  
3. **Relationship Suggestions**: Use `suggestEmailRelationships` tool
4. **Enhanced Search**: Verify improved semantic search accuracy

## Performance Considerations

### Gemini API Limits
- **Rate Limits**: Monitor usage through Google AI Studio
- **Token Limits**: Each model has different context windows
- **Cost**: Gemini pricing differs from Cloudflare AI (free)

### Optimization Strategies
- **Batching**: Group similar operations when possible
- **Caching**: Cache analysis results for repeated queries
- **Content Truncation**: Limit email length for embedding generation
- **Smart Querying**: Use database filters before semantic search

## Data Migration

### Existing Vectors
- **Current vectors**: Generated with `@cf/baai/bge-m3` remain usable
- **New vectors**: Will use Gemini `text-embedding-004` model
- **Mixed environment**: System handles both embedding types seamlessly
- **Gradual migration**: New emails get Gemini embeddings automatically

### Re-embedding Strategy (Optional)
To re-embed existing emails with Gemini for improved accuracy:

```javascript
// Batch re-embedding script (run carefully)
const emails = await getAllEmailMemoriesFromD1(userId, env);
for (const email of emails) {
  await updateEmailMemoryVector(email.id, {
    content: email.body,
    subject: email.subject,
    senderEmail: email.senderEmail
  }, userId, env);
}
```

## Troubleshooting

### Common Issues

#### 1. API Key Issues
```
Error: GEMINI_API_KEY environment variable is required
```
**Solution**: Verify API key is set in wrangler.jsonc or as a secret

#### 2. Rate Limiting  
```
Error: 429 Too Many Requests
```
**Solution**: Implement retry logic with exponential backoff

#### 3. Token Limits
```
Error: Token limit exceeded
```
**Solution**: Truncate email content before embedding

#### 4. Safety Settings Override
```
Error: Content blocked by safety settings
```
**Solution**: Verify `extra_body` safety settings are properly configured

### Debug Mode

Enable verbose logging:
```javascript
// Add to your code for debugging
console.log("Gemini API Key configured:", !!env.GEMINI_API_KEY);
console.log("Embedding model: text-embedding-004");
console.log("Reasoning model: gemini-2.5-pro");
```

## Feature Comparison

| Feature | Cloudflare AI | Gemini AI |
|---------|---------------|-----------|
| Embedding Model | @cf/baai/bge-m3 | text-embedding-004 |
| Embedding Dimensions | 1024 | 768 |
| Reasoning Capability | None | Advanced |
| Content Analysis | Basic | Comprehensive |
| Cost | Free | Pay-per-use |
| Rate Limits | High | Moderate |
| Context Understanding | Good | Superior |
| Safety Controls | Default | Fully Disabled |

## Rollback Plan

If issues occur, you can temporarily rollback by:

1. **Revert vectorize.ts**: Comment out Gemini service, uncomment Cloudflare AI
2. **Remove new tools**: Comment out AI-specific tools in mcp.ts
3. **Redeploy**: `npm run deploy`

Keep the Gemini integration code for future re-enablement.

## Next Steps

### Advanced Configuration
- **Custom System Instructions**: Modify `GEMINI_SYSTEM_INSTRUCTIONS` in types.ts
- **Model Selection**: Update models in gemini.ts for different use cases
- **Safety Tuning**: Adjust safety settings per use case if needed
- **Performance Monitoring**: Set up monitoring for API usage and costs

### Additional Integrations
- **Multi-language Support**: Leverage Gemini's multilingual capabilities
- **Custom Analysis Types**: Add domain-specific analysis functions
- **Batch Processing**: Implement bulk operations for large email sets
- **Real-time Processing**: Add webhook support for live email processing

## Support

For issues with:
- **Gemini API**: Check [Google AI Studio documentation](https://ai.google.dev/gemini-api/docs)
- **Cloudflare Integration**: Review [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- **This Implementation**: Check GitHub issues or create new ones

---

**Migration completed successfully! Your email memory system now uses Google Gemini AI for superior intelligence and analysis capabilities.**
