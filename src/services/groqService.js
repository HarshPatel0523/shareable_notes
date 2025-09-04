/* eslint-disable no-unused-vars */
import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

// Available models for different tasks
const MODELS = {
  GENERAL: "llama-3.1-8b-instant",
  LARGE: "llama3-70b-8192",
  MIXTRAL: "mixtral-8x7b-32768",
  FAST: "llama-3.1-8b-instant"
};

export class GroqService {
  static async analyzeGrammar(text) {
    // Don't analyze very short text
    if (!text || text.trim().length < 10) {
      return [];
    }

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a grammar checking assistant. Analyze the given text and return ONLY a JSON array of grammar errors. Each error should have this exact format:
            [
              {
                "text": "the incorrect text",
                "suggestion": "the corrected text",
                "type": "grammar",
                "message": "explanation of the error",
                "start": 0,
                "end": 10
              }
            ]
            Return an empty array [] if no errors are found. IMPORTANT: Return ONLY valid JSON, no other text.`
          },
          {
            role: "user",
            content: `Check this text for grammar errors: "${text.substring(0, 500)}"` // Limit text length
          }
        ],
        model: MODELS.GENERAL, // Changed from MODELS.FAST to MODELS.GENERAL
        temperature: 0.1,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        return [];
      }

      // Clean up the response to extract JSON
      let jsonStr = response;
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      try {
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.warn('Failed to parse grammar response:', response);
        return [];
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
      return [];
    }
  }

  static async generateInsights(noteContent, allNotes = []) {
    // Don't analyze very short content
    if (!noteContent || noteContent.trim().length < 50) {
      return {
        summary: "Note is too short for meaningful analysis",
        keyThemes: [],
        suggestions: ["Add more content to get better insights"],
        relatedTopics: [],
        readingTime: "< 1 minute",
        complexity: "simple",
        tags: []
      };
    }

    try {
      const otherNoteTitles = allNotes
        .filter(note => note.content !== noteContent)
        .map(note => note.title)
        .slice(0, 5); // Reduced to 5 for better performance

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that analyzes notes and provides intelligent insights. Based on the note content, provide insights in JSON format with these sections:
            {
              "summary": "A brief 2-3 sentence summary of the main points",
              "keyThemes": ["theme1", "theme2", "theme3"],
              "suggestions": ["actionable suggestion 1", "actionable suggestion 2"],
              "relatedTopics": ["related topic 1", "related topic 2"],
              "readingTime": "estimated reading time in minutes",
              "complexity": "simple|moderate|complex",
              "tags": ["auto-generated tag 1", "tag 2", "tag 3"]
            }
            Keep responses concise and actionable. Return ONLY valid JSON, no other text.`
          },
          {
            role: "user",
            content: `Analyze this note content and provide insights:

Note Content:
"${noteContent.substring(0, 1000)}"

${otherNoteTitles.length > 0 ? `
Other notes in the collection:
${otherNoteTitles.map(title => `- ${title}`).join('\n')}
` : ''}`
          }
        ],
        model: MODELS.GENERAL,
        temperature: 0.3,
        max_tokens: 800
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        return null;
      }

      // Clean up the response to extract JSON
      let jsonStr = response;
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('Failed to parse insights response:', response);
        return {
          summary: "Unable to generate summary - parsing error",
          keyThemes: [],
          suggestions: [],
          relatedTopics: [],
          readingTime: "Unknown",
          complexity: "moderate",
          tags: []
        };
      }
    } catch (error) {
      console.error('Insights generation failed:', error);
      return {
        summary: "Failed to generate insights",
        keyThemes: [],
        suggestions: [],
        relatedTopics: [],
        readingTime: "Unknown",
        complexity: "moderate",
        tags: []
      };
    }
  }

  static async summarizeNote(content) {
    if (!content || content.trim().length < 50) {
      return "Content is too short to summarize";
    }

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a summarization expert. Create a concise, well-structured summary that captures the main points and key information from the given text. Keep it clear and actionable. Return only the summary text, no additional formatting."
          },
          {
            role: "user",
            content: `Please summarize this note content:\n\n${content.substring(0, 2000)}` // Limit content length
          }
        ],
        model: MODELS.GENERAL,
        temperature: 0.2,
        max_tokens: 300
      });

      return completion.choices[0]?.message?.content?.trim() || "Unable to generate summary";
    } catch (error) {
      console.error('Summarization failed:', error);
      return "Summary generation failed";
    }
  }

  static async findRelatedNotes(currentNote, allNotes) {
    try {
      const otherNotes = allNotes.filter(note => note.id !== currentNote.id);
      if (otherNotes.length === 0) return [];

      // Limit to first 10 notes for performance
      const limitedNotes = otherNotes.slice(0, 10);

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an AI that finds related notes based on content similarity. Analyze the current note and find the most related notes from the provided list. Return ONLY a JSON array of note IDs ordered by relevance (most relevant first). Maximum 3 results.
            Format: ["noteId1", "noteId2", "noteId3"]
            Return ONLY valid JSON, no other text.`
          },
          {
            role: "user",
            content: `Current note:
Title: ${currentNote.title}
Content: ${currentNote.content.substring(0, 300)}

Available notes to compare:
${limitedNotes.map(note => `ID: ${note.id}, Title: ${note.title}, Content: ${note.content.substring(0, 150)}...`).join('\n\n')}`
          }
        ],
        model: MODELS.GENERAL, // Changed from MODELS.FAST to MODELS.GENERAL
        temperature: 0.1,
        max_tokens: 200
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (!response) {
        return [];
      }

      // Clean up the response to extract JSON
      let jsonStr = response;
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      try {
        const relatedIds = JSON.parse(jsonStr);
        if (Array.isArray(relatedIds)) {
          return otherNotes.filter(note => relatedIds.includes(note.id));
        }
        return [];
      } catch (parseError) {
        console.warn('Failed to parse related notes response:', response);
        return [];
      }
    } catch (error) {
      console.error('Related notes search failed:', error);
      return [];
    }
  }

  // Test API connection
  static async testConnection() {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "Hello, please respond with 'API connection successful'"
          }
        ],
        model: MODELS.GENERAL, // Changed from MODELS.FAST to MODELS.GENERAL
        temperature: 0.1,
        max_tokens: 50
      });

      return completion.choices[0]?.message?.content?.includes('successful') || false;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  // Check if API key is configured
  static isConfigured() {
    return !!import.meta.env.VITE_GROQ_API_KEY;
  }

  // Get available models
  static getAvailableModels() {
    return MODELS;
  }
}
