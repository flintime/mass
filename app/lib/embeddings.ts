import { OpenAI } from 'openai';
import { Business } from '@/app/types/business';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import {
  getCachedVectorEmbedding,
  cacheVectorEmbedding,
  getCachedSearchResults,
  cacheSearchResults,
  trackPopularSearch
} from './redis';
import { vectorStore, getEmbedding } from './vector-store';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Define the type for the mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnecting?: boolean;
  lastError?: Error;
  connectionAttempts?: number;
}

// Declare the global type
declare global {
  var mongoose: MongooseCache | undefined;
}

// MongoDB connection with caching
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectToMongoDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured in environment variables');
}

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultQuery: { 
    'api-version': process.env.OPENAI_API_VERSION || '2024-02'
  }
});

// Metadata structure for vector storage
interface VectorMetadata {
  name: string;
  category: string;
  description: string;
  subcategories: string[];
  features: string[];
  latitude: string;
  longitude: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

export interface EnhancedSearchResult extends Business {
  relevance_score: number;
  ai_explanation: string;
  matches_category: boolean;
  matches_requirements: string[];
}

// Function to create embeddings - now using the centralized getEmbedding function
export async function createEmbedding(text: string) {
  try {
    // Check cache first
    const cachedEmbedding = await getCachedVectorEmbedding(text);
    if (cachedEmbedding) {
      console.log('Using cached embedding for:', text);
      return cachedEmbedding;
    }

    // Use the centralized getEmbedding function from vector-store.ts
    const embedding = await getEmbedding(text);
    
    // Cache the embedding
    await cacheVectorEmbedding(text, embedding);

    return embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

// Function to create and store business embeddings
export async function storeBussinessEmbeddings(business: Business) {
  try {
    // Create a rich text representation of the business
    const businessText = `
      Business Name: ${business.business_name}
      Category: ${business.Business_Category}
      Description: ${business.description}
      Subcategories: ${business.Business_Subcategories?.join(', ')}
      Features: ${business.business_features?.join(', ')}
    `.trim();

    // Generate embedding
    const embedding = await createEmbedding(businessText);

    // Store in local vector store
    const id = business.id || business._id?.toString() || new Date().getTime().toString();
    
    // Use storeDocument method instead of addVector
    await vectorStore.storeDocument({
      id,
      content: businessText,
      businessId: id,
      metadata: {
        name: business.business_name,
        category: business.Business_Category,
        description: business.description,
        subcategories: business.Business_Subcategories || [],
        features: business.business_features || [],
        latitude: business.latitude?.toString() || '',
        longitude: business.longitude?.toString() || ''
      }
    }, embedding);

    return true;
  } catch (error) {
    console.error('Error storing business embedding:', error);
    throw error;
  }
}

export async function searchBusinesses(query: string): Promise<EnhancedSearchResult[]> {
  try {
    console.log('Starting search for query:', query);
    
    // Check cache first
    const cachedResults = await getCachedSearchResults(query);
    if (cachedResults) {
      console.log('Using cached results for query:', query);
      return cachedResults as EnhancedSearchResult[];
    }

    // Track this search query
    await trackPopularSearch(query);

    // Get search intent with structured output
    const intentResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: 'Analyze the search query and return a JSON object with category and requirements. Format: {"category":"string","requirements":["string"],"subcategories":["string"]}'
        },
        {
          role: "user",
          content: query
        }
      ],
      response_format: { type: "json_object" }
    });

    let searchIntent;
    try {
      const content = intentResponse.choices[0]?.message?.content;
      if (!content) {
        console.error('No content in OpenAI response');
        searchIntent = { category: query, requirements: [query] };
      } else {
        console.log('OpenAI response content:', content);
        searchIntent = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Error parsing search intent:', parseError);
      console.error('Raw content:', intentResponse.choices[0]?.message?.content);
      searchIntent = { category: query, requirements: [query] };
    }
    
    console.log('Parsed search intent:', searchIntent);

    // Generate embedding for the enhanced query
    const enhancedQuery = `${searchIntent.category || query} ${searchIntent.subcategories?.join(' ') || ''} ${searchIntent.requirements?.join(' ') || ''}`.trim();
    const queryEmbedding = await createEmbedding(enhancedQuery);
    
    // Use the vectorStore adapter instead of direct Pinecone access
    // This ensures consistency with the chat functionality
    const businessIds = new Set<string>();
    const matchesById = new Map<string, { score: number }>();
    
    // Collect all businesses from the vector store
    const baseBusinesses = await mongoose.connection.collection('businesses').find({}).toArray();
    
    for (const business of baseBusinesses) {
      const businessId = business._id.toString();
      
      // Retrieve relevant documents from the vector store
      const results = await vectorStore.retrieveRelevant(businessId, enhancedQuery, 10);
      
      if (results.length > 0) {
        // Calculate average score for this business
        const avgScore = results.reduce((sum, doc) => sum + (doc.metadata.score || 0), 0) / results.length;
        
        businessIds.add(businessId);
        matchesById.set(businessId, { score: avgScore });
      }
    }
    
    if (businessIds.size === 0) {
      console.log('No matches found in vector search');
      return [];
    }
    
    // Fetch full business details from MongoDB
    const businesses = await fetchBusinessesFromDB(Array.from(businessIds));
    if (!businesses || businesses.length === 0) {
      console.log('No businesses found in MongoDB');
      return [];
    }

    // Prepare business data for analysis
    const businessData = businesses.map(b => ({
      id: b._id?.toString() || '',
      name: b.business_name,
      category: b.Business_Category,
      subcategories: b.Business_Subcategories || [],
      description: b.description || '',
      features: b.business_features || []
    }));

    // Analyze relevance with structured output
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: 'Analyze business relevance to the search query. Return a JSON object with format: {"results":[{"business_id":"string","relevance_score":0.5,"explanation":"string","matches_category":true,"matches_requirements":[]}]}'
        },
        {
          role: "user",
          content: `Analyze these businesses for the query "${query}". Return results only for businesses that could reasonably provide the service.
Business data: ${JSON.stringify(businessData)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse and validate response
    let rankings: RankingResponse;
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('No content in OpenAI ranking response');
        rankings = { results: [] };
      } else {
        console.log('OpenAI ranking response:', content);
        const parsed = JSON.parse(content);
        if (!parsed.results || !Array.isArray(parsed.results)) {
          console.error('Invalid response format from OpenAI:', parsed);
          rankings = { results: [] };
        } else {
          rankings = parsed as RankingResponse;
        }
      }
    } catch (error) {
      console.error('Error parsing OpenAI ranking response:', error);
      console.error('Raw content:', response.choices[0]?.message?.content);
      rankings = { results: [] };
    }

    console.log('Parsed rankings:', rankings);

    // Combine vector scores with AI rankings
    const results = rankings.results
      .map((ranking: BusinessRanking) => {
        const business = businesses.find(b => b._id?.toString() === ranking.business_id);
        const vectorMatch = matchesById.get(ranking.business_id);
        
        if (!business || !vectorMatch || !vectorMatch.score) return null;

        const combinedScore = (
          (vectorMatch.score * 0.4) +  // 40% weight to vector similarity
          (ranking.relevance_score * 0.6)  // 60% weight to AI relevance
        );

        const enhancedResult: EnhancedSearchResult = {
          ...business,
          relevance_score: combinedScore,
          ai_explanation: ranking.explanation,
          matches_category: ranking.matches_category,
          matches_requirements: ranking.matches_requirements
        };

        return enhancedResult;
      })
      .filter((result): result is EnhancedSearchResult => result !== null)
      .filter(result => result.relevance_score >= 0.3)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    // Cache the results
    await cacheSearchResults(query, results);

    return results;
  } catch (error) {
    console.error('Error in searchBusinesses:', error);
    throw error;
  }
}

async function analyzeSearchIntent(query: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: "Extract search intent as JSON with category, requirements, location, timing, and price range fields."
        },
        {
          role: "user",
          content: query
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return {
        category: query,
        requirements: [query],
        location_preference: null,
        timing_preference: null,
        price_range: null
      };
    }
  } catch (error) {
    console.error('Error in analyzeSearchIntent:', error);
    return {
      category: query,
      requirements: [query],
      location_preference: null,
      timing_preference: null,
      price_range: null
    };
  }
}

interface RankedBusiness {
  business_id: string;
  relevance_score: number;
  explanation: string;
  matches_category: boolean;
  matches_requirements: string[];
}

async function rankAndExplainResults(query: string, businesses: Business[], searchIntent: any): Promise<RankedBusiness[]> {
  try {
    // Prepare business data with proper escaping
    const businessData = businesses.map(b => ({
      id: b._id?.toString() || b.id?.toString() || '',
      name: b.business_name.replace(/"/g, '\\"'),
      category: b.Business_Category.replace(/"/g, '\\"')
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You analyze business relevance to search queries. Return a JSON object in this exact format:
{
  "results": [
    {
      "business_id": "string",
      "relevance_score": number between 0-1,
      "explanation": "string",
      "matches_category": boolean,
      "matches_requirements": []
    }
  ]
}`
        },
        {
          role: "user",
          content: `Search query: "${query.replace(/"/g, '\\"')}"\n\nAnalyze these businesses:\n${JSON.stringify(businessData, null, 2)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.results)) {
        throw new Error('Invalid response format');
      }
      return parsed.results;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError, '\nContent:', content);
      // Return basic rankings if parsing fails
      return businesses.map((b: Business): RankedBusiness => ({
        business_id: b._id?.toString() || b.id?.toString() || '',
        relevance_score: 0.5,
        explanation: "Basic match",
        matches_category: true,
        matches_requirements: []
      }));
    }
  } catch (error) {
    console.error('Error in rankAndExplainResults:', error);
    return businesses.map((b: Business): RankedBusiness => ({
      business_id: b._id?.toString() || b.id?.toString() || '',
      relevance_score: 0.5,
      explanation: "Basic match",
      matches_category: true,
      matches_requirements: []
    }));
  }
}

async function fetchBusinessesFromDB(ids: string[]): Promise<Business[]> {
  try {
    await connectToMongoDB();
    const businesses = await mongoose
      .connection
      .collection('businesses')
      .find({ 
        $or: [
          { _id: { $in: ids.map(id => new ObjectId(id)) } },
          { id: { $in: ids } }
        ]
      })
      .toArray();
    
    return businesses.map((business: any) => ({
      _id: business._id.toString(),
      id: business._id.toString(),
      business_name: business.business_name || '',
      description: business.description || '',
      Business_Category: business.Business_Category || '',
      Business_Subcategories: business.Business_Subcategories || [],
      business_features: business.business_features || [],
      images: business.images || [],
      latitude: parseFloat(business.latitude) || undefined,
      longitude: parseFloat(business.longitude) || undefined,
      address: business.address || '',
      city: business.city || '',
      state: business.state || '',
      zip_code: business.zip_code || '',
      phone: business.phone || '',
      email: business.email || '',
      Website: business.Website,
      rating: business.rating,
      totalReviews: business.totalReviews,
      price: business.price,
      distance: business.distance,
      availability: business.availability,
      availableNow: business.availableNow,
      pricing: business.pricing,
      offers: business.offers,
      relevance_score: business.relevance_score,
      ai_explanation: business.ai_explanation,
      vector_score: business.vector_score,
      search_score: business.search_score,
      final_score: business.final_score
    }));
  } catch (error) {
    console.error('Error fetching businesses from DB:', error);
    return [];
  }
}

// Function to batch process business embeddings
export async function batchProcessBusinesses(businesses: Business[]) {
  try {
    console.log(`Starting batch processing of ${businesses.length} businesses`);
    
    const batchSize = 100; // Adjust based on your needs
    const batches = [];

    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      batches.push(batch);
    }

    console.log(`Split into ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      console.log(`Processing batch ${i + 1}/${batches.length}`);
      
      const batchPromises = batches[i].map(business => storeBussinessEmbeddings(business));
      await Promise.all(batchPromises);
      
      console.log(`Completed batch ${i + 1}`);
    }

    console.log('Batch processing completed');
    return true;
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw error;
  }
}

interface BusinessRanking {
  business_id: string;
  relevance_score: number;
  explanation: string;
  matches_category: boolean;
  matches_requirements: string[];
}

interface RankingResponse {
  results: BusinessRanking[];
} 