#!/bin/bash

# Create new Vectorize index for Gemini embeddings (768 dimensions)
echo "Creating new Vectorize index for Gemini embeddings..."

npx wrangler vectorize create mcp-memoryv2-gemini --dimensions=768 --metric=cosine

echo "Vectorize index 'mcp-memoryv2-gemini' created successfully!"
echo "Please update your wrangler.jsonc to use the new index name returned above."
