import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import dbConnect from '@/lib/db';
import Business from '@/app/models/business.model';
import { localVectorStore } from '@/app/lib/local-vector-store';
import { vectorStore } from '@/app/lib/vector-store';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are an AI-powered search assistant for Flintime, a platform that helps users find businesses based on EXACT service matches only. Your primary goal is to return ONLY businesses that explicitly list the exact services requested.

STRICT MATCHING RULES:
1. ONLY return businesses that EXPLICITLY list the exact service in their 'services' array
2. DO NOT make any assumptions or inferences about services
3. DO NOT use business categories or features to imply services
4. DO NOT use business descriptions to infer additional services
5. DO NOT consider related or similar services as matches
6. Ignore generic terms like "24/7", "emergency", or "professional" when matching
7. Service matching must be EXACT and LITERAL

Examples of INCORRECT matching:
- Business offers "plumbing" → DO NOT match for "pipe repair" unless explicitly listed
- Business is "HVAC company" → DO NOT match for "AC repair" unless explicitly listed
- Business has "24/7 emergency" → DO NOT match any service unless specifically stated
- Business does "installations" → DO NOT match for specific installation types unless listed

VALIDATION REQUIREMENTS:
1. The exact service term must appear in the business's 'services' array
2. Word order and minor variations are not matches (e.g., "repair AC" ≠ "AC repair")
3. Category matches are not service matches
4. Generic service terms must have specific qualifiers

Return response in this exact JSON format:
{
  "matches": [
    {
      "business_id": "string",
      "relevance_score": number between 0-1,
      "exact_service_match": "string showing the exact matching service from business listing",
      "confidence": "HIGH only if exact match, MEDIUM if close variation, LOW if any uncertainty",
      "requires_verification": boolean
    }
  ],
  "search_precision": {
    "exact_matches_only": boolean,
    "inferred_matches": boolean (should always be false),
    "confidence_level": "HIGH" | "MEDIUM" | "LOW"
  },
  "suggestions": ["alternative search terms for exact matches"],
  "clarification_needed": boolean,
  "clarification_question": "string if more specific service details needed"
}`;

async function analyzeQuery(query: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are a precise service query analyzer. Your job is to extract ONLY explicitly stated service requirements with NO inference or assumptions.

STRICT ANALYSIS RULES:
1. Only include services that are EXPLICITLY mentioned
2. DO NOT infer related services
3. DO NOT expand generic terms into specific services
4. DO NOT assume service capabilities from business types
5. Require specific service terms (e.g., "AC repair" not just "repair")
6. Flag any ambiguous or generic terms for clarification

Return a JSON object with:
{
  "exact_service_required": "the specific service as stated in the query",
  "service_components": {
    "action": "specific action (repair, install, etc.)",
    "item": "specific item or system",
    "qualifiers": ["any specific requirements explicitly stated"]
  },
  "requires_clarification": boolean,
  "clarification_needed_for": ["list of ambiguous terms"],
  "search_terms": {
    "must_include": ["terms that MUST appear in service listing"],
    "must_not_infer": ["terms that should not be inferred"]
  }
}`
      },
      {
        role: "user",
        content: query
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error('No content in OpenAI query analysis response');
    return {
      exact_service_required: query,
      service_components: {
        action: null,
        item: null,
        qualifiers: []
      },
      requires_clarification: false,
      clarification_needed_for: [],
      search_terms: {
        must_include: [],
        must_not_infer: []
      }
    };
  }

  try {
    const parsedResponse = JSON.parse(content);
    // Validate the response format
    if (!parsedResponse.exact_service_required || !parsedResponse.service_components || !parsedResponse.requires_clarification || !parsedResponse.clarification_needed_for || !parsedResponse.search_terms) {
      console.error('Invalid query analysis format from OpenAI:', parsedResponse);
      return {
        exact_service_required: query,
        service_components: {
          action: null,
          item: null,
          qualifiers: []
        },
        requires_clarification: true,
        clarification_needed_for: [],
        search_terms: {
          must_include: [],
          must_not_infer: []
        }
      };
    }
    return parsedResponse;
  } catch (error) {
    console.error('Error parsing OpenAI query analysis response:', error);
    console.error('Raw content:', content);
    return {
      exact_service_required: query,
      service_components: {
        action: null,
        item: null,
        qualifiers: []
      },
      requires_clarification: true,
      clarification_needed_for: [],
      search_terms: {
        must_include: [],
        must_not_infer: []
      }
    };
  }
}

async function searchBusinesses(queryAnalysis: any, userLocation?: { lat: number; lng: number }) {
  // Create rich query text with precise service matching and explicit service type
  const queryText = `
    Service Type: ${queryAnalysis.service_type}
    Item Category: ${queryAnalysis.item_category}
    Action Type: ${queryAnalysis.action_type}
    Special Requirements: ${queryAnalysis.special_requirements?.join(', ') || ''}
    Location: ${queryAnalysis.location_preference || 'Any'}
    Service Category: ${queryAnalysis.action_type.includes('repair') ? 'repair' : 
                      queryAnalysis.action_type.includes('cleaning') ? 'cleaning' : 
                      queryAnalysis.action_type.includes('installation') ? 'installation' : 'other'}
  `.trim();

  // Get vector embedding for the query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: queryText
  });
  
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Use local vector store for semantic search
  const semanticResults = await vectorStore.retrieveRelevant('all', queryText, 50);
  
  // Get the business IDs from semantic results
  const relevantBusinessIds = semanticResults.map(result => result.businessId).filter(Boolean);

  // Get all businesses with their complete details
  const allBusinesses = await Business.find({
    // If we have semantic results, filter by them, otherwise get all businesses
    ...(relevantBusinessIds.length > 0 && { _id: { $in: relevantBusinessIds } })
  })
    .select('_id business_name description Business_Category Business_Subcategories services business_features location address city state zip_code phone email Website images')
    .lean();

  console.log(`Found ${allBusinesses.length} total businesses to analyze`);

  // Comprehensive business validation function
  function validateBusiness(business: any, query: any): {
    isValid: boolean;
    matchedServices: string[];
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // 1. Basic validation - require services array
    if (!business.services || !Array.isArray(business.services) || business.services.length === 0) {
      reasons.push("Business has no services listed");
      return { isValid: false, matchedServices: [], score: 0, reasons };
    }

    // 2. Check for exact service matches only
    const matchedServices = business.services.filter((service: string) => {
      const serviceLower = service.toLowerCase();
      const queryLower = query.service_type.toLowerCase();
      
      // Only consider exact matches
      return serviceLower === queryLower || 
             serviceLower.includes(queryLower) || 
             queryLower.includes(serviceLower);
    });

    // 3. Return false if no exact matches found
    if (matchedServices.length === 0) {
      reasons.push("No exact service matches found");
      return { isValid: false, matchedServices: [], score: 0, reasons };
    }

    // 4. Calculate score based only on service matches
    const score = matchedServices.length > 0 ? 0.8 : 0;
    reasons.push(`Found ${matchedServices.length} exact service matches`);

    return {
      isValid: true,
      matchedServices,
      score,
      reasons
    };
  }

  // Analyze and filter businesses
  const validatedBusinesses = allBusinesses.map(business => {
    const validation = validateBusiness(business, queryAnalysis);
    return {
      business,
      validation
    };
  }).filter(item => item.validation.isValid)
    .sort((a, b) => b.validation.score - a.validation.score)
    .slice(0, 10); // Get top 10 matches

  console.log(`Found ${validatedBusinesses.length} valid matches after detailed analysis`);

  if (validatedBusinesses.length === 0) {
    return {
      matches: [],
      suggestions: [
        `No businesses found that specifically offer ${queryAnalysis.service_type}`,
        `Try searching for "${queryAnalysis.item_category} ${queryAnalysis.action_type}"`,
        `Try searching for "${queryAnalysis.item_category} service"`
      ],
      clarification_needed: false,
      clarification_question: null
    };
  }

  // Format results
  const matches = validatedBusinesses.map(({ business, validation }) => ({
    business_id: (business._id as any).toString(),
    relevance_score: validation.score,
    explanation: `Matched services: ${validation.matchedServices.join(', ')}. ${validation.reasons.join('. ')}`,
    matched_services: validation.matchedServices,
    business_details: {
      name: business.business_name,
      category: business.Business_Category,
      location: `${business.city}, ${business.state}`,
      contact: {
        phone: business.phone,
        email: business.email
      }
    },
    action_buttons: {
      view_details: true,
      chat_to_book: true
    }
  }));

  return {
    matches,
    suggestions: matches.length < 3 ? [
      `Found ${matches.length} exact matches for ${queryAnalysis.service_type}`,
      `Try broadening your search to "${queryAnalysis.item_category} service"`,
      `Consider searching in nearby areas`
    ] : [],
    clarification_needed: false,
    clarification_question: null
  };
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { query, location } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Step 1: Analyze the query
    const queryAnalysis = await analyzeQuery(query);

    // Step 2: If clarification is needed, return immediately
    if (queryAnalysis.requires_clarification) {
      return NextResponse.json({
        clarification_needed: true,
        clarification_question: queryAnalysis.clarification_needed_for.join(', ')
      });
    }

    // Step 3: Search for matching businesses
    const searchResults = await searchBusinesses(queryAnalysis, location);

    // Step 4: Return the results
    return NextResponse.json(searchResults);

  } catch (error) {
    console.error('Error in search assistant:', error);
    return NextResponse.json(
      { error: 'Failed to process search request' },
      { status: 500 }
    );
  }
} 