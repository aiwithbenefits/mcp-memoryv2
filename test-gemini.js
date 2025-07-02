import { createGeminiService } from './src/utils/gemini.js';

// Test Gemini integration
async function testGeminiIntegration() {
  const env = {
    GEMINI_API_KEY: "AIzaSyD1TcNRx3fG6XXPr2Nw9ALkqYIix-MtH5g"
  };

  try {
    console.log("Testing Gemini service...");
    
    const geminiService = createGeminiService(env);
    
    // Test embedding generation
    console.log("Generating test embedding...");
    const embedding = await geminiService.generateEmbeddings("This is a test email for dimension validation");
    
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`Expected: 768 dimensions for Gemini text-embedding-004`);
    console.log(`Match: ${embedding.length === 768 ? 'YES' : 'NO'}`);
    
    if (embedding.length === 768) {
      console.log("🎉 Gemini integration is working correctly!");
    } else {
      console.error(`❌ Dimension mismatch: got ${embedding.length}, expected 768`);
    }
    
    return embedding.length === 768;
    
  } catch (error) {
    console.error("❌ Gemini integration test failed:", error);
    return false;
  }
}

testGeminiIntegration().then(success => {
  process.exit(success ? 0 : 1);
});
