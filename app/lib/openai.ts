import OpenAI from 'openai';
import { Business } from '../types/business';

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured in environment variables');
}

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultQuery: {
    'api-version': process.env.OPENAI_API_VERSION || '2024-02'
  }
});

export interface SearchLocation {
  lat: number;
  lng: number;
}

export async function generateSearchQuery(originalQuery: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Optimize search queries for a local business search engine. Return only the enhanced query terms without explanation."
        },
        {
          role: "user",
          content: originalQuery
        }
      ],
      temperature: 0,
      max_tokens: 100
    });

    return response.choices[0]?.message?.content || originalQuery;
  } catch (error) {
    console.error('Error generating enhanced search query:', error);
    return originalQuery;
  }
}

export async function enhanceSearchResults(
  query: string,
  businesses: Business[],
  userLocation: { lat: number; lng: number }
): Promise<Business[]> {
  try {
    // Prepare business data with proper escaping
    const businessData = businesses.map(b => ({
      name: b.business_name.replace(/"/g, '\\"'),
      category: b.Business_Category.replace(/"/g, '\\"'),
      subcategories: (b.Business_Subcategories || []).map(s => s.replace(/"/g, '\\"')),
      services: (b.services || []).map(s => s.replace(/"/g, '\\"')),
      features: (b.business_features || []).map(f => f.replace(/"/g, '\\"'))
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You analyze business relevance to search queries with a strong emphasis on exact service matches. 
Follow these STRICT rules:
1. ONLY consider services that are EXPLICITLY listed in the business's 'services' array
2. DO NOT make any assumptions about services based on business category, features, or description
3. DO NOT infer services that are not explicitly listed
4. A business with an exact service match in their services array should get a score of 0.8-1.0
5. A business with a partial service match in their services array should get a score of 0.4-0.7
6. A business with NO matching services in their services array MUST get a score of 0.0
7. Category and feature matches should be IGNORED if there is no service match

Return a JSON object in this exact format:
{
  "results": [
    {
      "score": number between 0-1 (MUST be 0 if no service match),
      "explanation": "string explaining why the score was given",
      "matched_services": string[] (ONLY services found in the services array)
    }
  ]
}`
        },
        {
          role: "user",
          content: `Search query: "${query.replace(/"/g, '\\"')}"\n\nAnalyze these businesses:\n${JSON.stringify(businessData, null, 2)}`
        }
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const analysis = JSON.parse(content);
      if (!Array.isArray(analysis.results)) {
        throw new Error('Invalid response format');
      }

      return businesses.map((business, index) => ({
        ...business,
        relevance_score: analysis.results[index]?.score || 0,
        ai_explanation: analysis.results[index]?.explanation || undefined,
        matched_services: analysis.results[index]?.matched_services || [],
        group: analysis.results[index]?.score >= 0.8 ? 'primary' : 
               analysis.results[index]?.score >= 0.4 ? 'secondary' : 'rejected'
      }));
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError, '\nContent:', content);
      return businesses;
    }
  } catch (error) {
    console.error('Error enhancing search results:', error);
    return businesses;
  }
}
