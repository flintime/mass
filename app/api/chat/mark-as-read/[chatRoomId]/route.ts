import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { MongoClient, ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MONGODB_URI = process.env.MONGODB_URI as string;

// Verify the business token and get business ID
async function getBusinessFromToken(req: NextRequest): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('businessAuthToken')?.value;

    if (!token) {
      console.log('No business auth token found in cookies');
      return null;
    }

    const decoded = verify(token, JWT_SECRET) as { businessId?: string };
    
    if (!decoded.businessId) {
      console.log('No business ID found in token');
      return null;
    }

    return decoded.businessId;
  } catch (error) {
    console.error('Error verifying business token:', error);
    return null;
  }
}

// Verify the user token and get user ID
async function getUserFromToken(req: NextRequest): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      console.log('No user auth token found in cookies');
      return null;
    }

    const decoded = verify(token, JWT_SECRET) as { userId?: string };
    
    if (!decoded.userId) {
      console.log('No user ID found in token');
      return null;
    }

    return decoded.userId;
  } catch (error) {
    console.error('Error verifying user token:', error);
    return null;
  }
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// PUT route to mark messages as read
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatRoomId: string } }
) {
  let dbClient;
  
  try {
    const chatRoomId = params.chatRoomId;
    console.log('Mark as read request for chatRoomId:', chatRoomId);

    // Check URLs and request headers to determine request origin
    const referer = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const authContext = request.headers.get('X-Auth-Context') || '';
    const requestSource = request.headers.get('X-Request-Source') || '';
    
    const isUserInterface = referer.includes('/chat/') || 
                           userAgent.includes('Mobile') || 
                           authContext === 'chat-user' ||
                           requestSource.includes('chat-interface');
                           
    const isBusinessInterface = referer.includes('/business/') || 
                               referer.includes('/dashboard/') ||
                               authContext === 'business-dashboard';
    
    console.log('Request origin analysis:', { 
      referer, 
      authContext,
      requestSource,
      isUserInterface, 
      isBusinessInterface,
      preferUserAuth: isUserInterface && !isBusinessInterface
    });
    
    // Helper function to detect business messages with maximum flexibility
    const isBusinessMessage = (msg: any): boolean => {
      return (
        // Check string formats (case insensitive)
        (typeof msg.senderType === 'string' && 
          (msg.senderType.toUpperCase().includes('BUSINESS') || 
           msg.senderType.toUpperCase() === 'B')) ||
        // Check number format (if senderType is stored as enum)
        (typeof msg.senderType === 'number' && msg.senderType === 1) ||
        // Check if there's a separate business indicator field
        (msg.businessId || msg.fromBusiness || msg.isBusinessMessage) ||
        // Check if 'from' field exists and contains business identifier
        (msg.from && 
         (typeof msg.from === 'string' ? 
           msg.from.includes('business') : 
           msg.from.type?.includes('business')))
      );
    };
    
    // Try to authenticate with both methods
    const businessId = await getBusinessFromToken(request);
    const userId = await getUserFromToken(request);
    
    console.log('Auth tokens found:', { 
      businessId, 
      userId,
      // If we're in the user interface, prioritize user authentication
      prioritizeUser: isUserInterface
    });
    
    // Determine authentication mode - prioritize USER auth for chat interface
    let authMode = 'unknown';
    if (isUserInterface && userId) {
      authMode = 'user';
      console.log('Using USER authentication mode based on interface context');
    } else if (isBusinessInterface && businessId) {
      authMode = 'business';
      console.log('Using BUSINESS authentication mode based on interface context');
    } else if (userId) {
      authMode = 'user';
      console.log('Defaulting to USER authentication');
    } else if (businessId) {
      authMode = 'business';
      console.log('Defaulting to BUSINESS authentication');
    } else {
      console.log('Authentication failed for both business and user tokens');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Selected authentication mode:', authMode);

    // Validate chatRoomId
    if (!chatRoomId) {
      console.log('Missing chatRoomId parameter');
      return NextResponse.json({ error: 'Missing chat room ID' }, { status: 400 });
    }
    
    try {
      // Validate ObjectId format
      if (chatRoomId.match(/^[0-9a-fA-F]{24}$/)) {
        new ObjectId(chatRoomId);
      } else {
        throw new Error('Invalid ObjectId format');
      }
    } catch (error) {
      console.log('Invalid ObjectId format:', chatRoomId);
      return NextResponse.json({ error: 'Invalid chat room ID format' }, { status: 400 });
    }

    // Connect to database
    dbClient = await connectToDatabase();
    const db = dbClient.db();
    const chatRoomsCollection = db.collection('chatrooms');
    
    let chatRoom;
    
    // Determine if this is a business or user request
    if (authMode === 'business') {
      if (!businessId) {
        return NextResponse.json({ error: 'Invalid business authentication' }, { status: 401 });
      }
      
      // Business auth - mark USER messages as read
      chatRoom = await chatRoomsCollection.findOne({
        _id: new ObjectId(chatRoomId),
        businessId: new ObjectId(businessId)
      });
      
      if (!chatRoom) {
      return NextResponse.json({ 
        error: 'Chat room not found or access denied',
      }, { status: 404 });
    }

      // Get the current time for read timestamp
      const readTimestamp = new Date();
      
      // Parse the request body to get message IDs
      let messageIds: string[] = [];
      try {
        const body = await request.json();
        messageIds = Array.isArray(body.messageIds) ? body.messageIds : [];
        console.log('Received messageIds to mark as read:', messageIds);
      } catch (error) {
        console.error('Error parsing request body:', error);
        messageIds = []; // Default to empty array if parsing fails
      }
      
      // If specific message IDs were provided, only mark those as read
      const arrayFilters = messageIds.length > 0
        ? [{ 
            'elem.senderType': 'USER', 
            'elem.read': false,
            'elem._id': { $in: messageIds.map(id => new ObjectId(id)) }
          }]
        : [{ 'elem.senderType': 'USER', 'elem.read': false }];
      
      console.log('Using array filters:', JSON.stringify(arrayFilters));
      
      // Mark specified USER messages as read in this chat room
      const updateResult = await chatRoomsCollection.updateOne(
        { _id: new ObjectId(chatRoomId) },
        {
          $set: {
            'messages.$[elem].read': true,
            'messages.$[elem].readTimestamp': readTimestamp
          },
          $addToSet: {
            'messages.$[elem].readBy': businessId
          }
        },
        {
          arrayFilters: arrayFilters
        }
      );
      
      console.log('Business update result:', {
        acknowledged: updateResult.acknowledged,
        modifiedCount: updateResult.modifiedCount,
        matchedCount: updateResult.matchedCount
      });
      
      return NextResponse.json({
        success: true,
        messagesUpdated: updateResult.modifiedCount || 0,
        unreadCount: 0,
        authType: 'business',
        authMode: authMode,
        source: 'Updated business mark-as-read logic'
      }, { status: 200 });
      
    } else if (authMode === 'user') {
      if (!userId) {
        return NextResponse.json({ error: 'Invalid user authentication' }, { status: 401 });
      }
      
      // User auth - mark BUSINESS messages as read
      console.log('Looking for chat room with userId:', userId);
      console.log('ChatRoomId:', chatRoomId);
      
      // First attempt: Try to find by exact string match (most common case)
      console.log('Attempt 1: Looking for chatRoom with exact string userId match');
      let chatRoom = await chatRoomsCollection.findOne({
        _id: new ObjectId(chatRoomId),
        userId: userId
      });
      
      // Second attempt: Try ObjectId conversion if it's a valid format
      if (!chatRoom && userId.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('Attempt 2: Looking for chatRoom with userId as ObjectId');
        try {
          chatRoom = await chatRoomsCollection.findOne({
            _id: new ObjectId(chatRoomId),
            userId: new ObjectId(userId)
          });
        } catch (error) {
          console.error('Error converting userId to ObjectId:', error);
        }
      }
      
      // Third attempt: Try a more flexible query with $or
      if (!chatRoom) {
        console.log('Attempt 3: Using flexible $or query for userId');
        try {
          // Using a flexible query that can match either format
          const query: any = { _id: new ObjectId(chatRoomId) };
          
          if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            query.$or = [
              { userId: userId },
              { userId: new ObjectId(userId) }
            ];
          } else {
            query.userId = userId;
          }
          
          console.log('Flexible query:', JSON.stringify(query, null, 2));
          chatRoom = await chatRoomsCollection.findOne(query);
        } catch (error) {
          console.error('Error with flexible query:', error);
        }
      }
      
      // Final attempt: Get the chat room by ID only and log its details to debug
      if (!chatRoom) {
        console.log('Attempt 4: Debug - Getting chat room by ID only to check its structure');
        const debugChatRoom = await chatRoomsCollection.findOne({ 
          _id: new ObjectId(chatRoomId) 
        });
        
        console.log('Debug - Chat room found by ID only:', {
          found: !!debugChatRoom,
          userId: debugChatRoom?.userId,
          userIdType: debugChatRoom?.userId ? typeof debugChatRoom.userId : 'undefined',
          isObjectId: debugChatRoom?.userId instanceof ObjectId,
          stringifiedUserId: debugChatRoom?.userId ? debugChatRoom.userId.toString() : 'undefined'
        });
      }
      
      console.log('Chat room found after all attempts:', !!chatRoom);
      
      if (!chatRoom) {
        return NextResponse.json({ 
          error: 'Chat room not found or access denied',
          userId: userId,
          chatRoomId: chatRoomId
        }, { status: 404 });
      }
      
      // Count unread messages before update
      const unreadCountBefore = chatRoom.messages ? 
        chatRoom.messages.filter((msg: any) => msg.senderType === 'BUSINESS' && !msg.read).length : 0;
      
      console.log('User unread count before update:', unreadCountBefore);
      
      // Get the current time for read timestamp
      const readTimestamp = new Date();
      
      // For all unread messages, pull them, update them, and push them back
      // This is more reliable than array filters when format differences exist
      const chatRoomBefore = await chatRoomsCollection.findOne({ 
        _id: new ObjectId(chatRoomId) 
      });
      
      // Initialize variables for tracking updates
      let messagesUpdated = 0;
      let totalUpdated = 0;
      let updateResult: any = { modifiedCount: 0, matchedCount: 0, acknowledged: true };
      
      if (chatRoomBefore && chatRoomBefore.messages) {
        // Extra debugging - dump the ENTIRE first business message
        const firstBusinessMsg = chatRoomBefore.messages.find((msg: any) => 
          msg.senderType === 'BUSINESS' || msg.senderType === 'business');
        
        if (firstBusinessMsg) {
          console.log('FULL BUSINESS MESSAGE DUMP:', JSON.stringify(firstBusinessMsg, null, 2));
          console.log('BUSINESS MESSAGE ID TYPE:', typeof firstBusinessMsg._id);
          console.log('BUSINESS MESSAGE ID CONSTRUCTOR:', firstBusinessMsg._id?.constructor?.name);
          console.log('BUSINESS SENDER TYPE EXACT VALUE:', JSON.stringify(firstBusinessMsg.senderType));
        } else {
          console.log('NO BUSINESS MESSAGES FOUND IN THIS CHAT');
        }

        // Log some sample messages to understand their structure
        console.log('DEBUGGING - Sample message structure:');
        const sampleMessage = chatRoomBefore.messages.find((msg: any) => 
          msg.senderType === 'BUSINESS' && !msg.read);
        
        if (sampleMessage) {
          console.log('Sample unread BUSINESS message:', {
            _id: sampleMessage._id,
            _idType: typeof sampleMessage._id,
            isObjectId: sampleMessage._id instanceof ObjectId,
            toString: String(sampleMessage._id),
            content: sampleMessage.content?.substring(0, 30) + '...',
            read: sampleMessage.read,
            senderType: sampleMessage.senderType
          });
        }
        
        // Get unread BUSINESS messages
        const unreadBusinessMessages = chatRoomBefore.messages.filter((msg: any) => 
          isBusinessMessage(msg) && msg.read !== true
        );
        
        console.log(`Found ${unreadBusinessMessages.length} unread BUSINESS messages to update`);
        
        // Use individual updates for each message instead of replacing the entire array
        if (unreadBusinessMessages.length > 0) {
          let totalUpdated = 0;
          
          // Process each message individually
          for (const msg of unreadBusinessMessages) {
            try {
              // Get the message ID in both string and ObjectId format
              const messageId = msg._id;
              const messageIdStr = String(messageId);
              
              console.log(`Trying to update message with ID: ${messageIdStr}`);
              console.log('Message details:', {
                content: msg.content?.substring(0, 30),
                senderType: msg.senderType,
                read: msg.read
              });
              
              // Use MongoDB's positional operator with explicit $elemMatch
              const updateSingleResult = await chatRoomsCollection.updateOne(
                { 
                  _id: new ObjectId(chatRoomId),
                  "messages": { 
                    $elemMatch: { 
                      "_id": messageId,
                      "senderType": { $in: ["BUSINESS", "business", "Business", "B"] },
                      "read": { $ne: true }
                    }
                  }
                },
                { 
                  $set: { 
                    "messages.$.read": true,
                    "messages.$.readTimestamp": readTimestamp
                  },
                  $addToSet: {
                    "messages.$.readBy": userId
                  }
                }
              );
              
              if (updateSingleResult.modifiedCount === 0) {
                // If the first attempt failed, try with a different approach
                console.log('First update attempt failed, trying alternative approach...');
                
                // Try with a direct update to array elements with atomic operators
                const updateAltResult = await chatRoomsCollection.updateOne(
                  { _id: new ObjectId(chatRoomId) },
                  { 
                    $set: { 
                      "messages.$[elem].read": true,
                      "messages.$[elem].readTimestamp": readTimestamp
                    },
                    $addToSet: {
                      "messages.$[elem].readBy": userId
                    }
                  },
                  {
                    arrayFilters: [
                      { 
                        "elem._id": messageId, 
          $or: [
                          { "elem.senderType": { $in: ["BUSINESS", "business", "Business", "B"] } },
                          { "elem.fromBusiness": { $exists: true } },
                          { "elem.isBusinessMessage": { $exists: true } }
                        ],
                        "elem.read": { $ne: true }
                      }
                    ]
                  }
                );
                
                console.log('Alternative update result:', {
                  matched: updateAltResult.matchedCount,
                  modified: updateAltResult.modifiedCount
                });
                
                if (updateAltResult.modifiedCount === 0) {
                  // If both attempts failed, try one more approach with string conversion
                  console.log('Second update attempt failed, trying final string comparison approach...');
                  
                  // Get all messages and manually update them
                  const chatRoomData = await chatRoomsCollection.findOne({ _id: new ObjectId(chatRoomId) });
                  
                  if (chatRoomData && chatRoomData.messages) {
                    // Find this message by string comparison of IDs
                    const msgIdStr = String(messageId);
                    const updatedMessages = chatRoomData.messages.map((m: any) => {
                      // If IDs match as strings and it's a business message that's not read
                      if (String(m._id) === msgIdStr && m.senderType === 'BUSINESS' && !m.read) {
                        console.log('Found matching message by string comparison:', {
                          id: String(m._id),
                          content: m.content?.substring(0, 30)
                        });
                        
                        // Initialize readBy array if it doesn't exist
                        const readBy = Array.isArray(m.readBy) ? [...m.readBy] : [];
                        // Add userId if not already present
                        if (!readBy.includes(userId)) {
                          readBy.push(userId);
                        }
                        
                        return {
                          ...m,
                          read: true,
                          readTimestamp: readTimestamp,
                          readBy: readBy
                        };
                      }
                      return m;
                    });
                    
                    // Replace the entire messages array with our updated version
                    const finalUpdateResult = await chatRoomsCollection.updateOne(
                      { _id: new ObjectId(chatRoomId) },
                      { $set: { messages: updatedMessages } }
                    );
                    
                    console.log('Final update with string comparison approach:', {
                      matched: finalUpdateResult.matchedCount,
                      modified: finalUpdateResult.modifiedCount
                    });
                    
                    // Count how many messages we actually changed
                    const changedCount = updatedMessages.filter((m: any) => 
                      String(m._id) === msgIdStr && m.read === true
                    ).length;
                    
                    totalUpdated += changedCount;
                  }
                } else {
                  console.log('Alternative update succeeded:', {
                    matched: updateAltResult.matchedCount,
                    modified: updateAltResult.modifiedCount
                  });
                  totalUpdated += updateAltResult.modifiedCount;
                }
              } else {
                console.log('First update succeeded:', {
                  matched: updateSingleResult.matchedCount,
                  modified: updateSingleResult.modifiedCount
                });
                totalUpdated += updateSingleResult.modifiedCount;
              }
              
            } catch (error) {
              console.error('Error updating individual message:', error);
            }
          }
          
          updateResult = { modifiedCount: totalUpdated, matchedCount: 1, acknowledged: true };
          console.log(`Successfully updated ${totalUpdated} of ${unreadBusinessMessages.length} messages`);
        } else {
          console.log('No unread BUSINESS messages found to update');
        }
        
        // ULTIMATE FALLBACK SOLUTION
        // If all previous attempts failed, try a direct approach with all possible variations
        if (totalUpdated === 0 && chatRoomBefore && chatRoomBefore.messages) {
          console.log('All previous update attempts failed. Trying ultimate fallback...');
          
          // Get all existing messages
          const existingMessages = chatRoomBefore.messages;
          let updated = false;
          
          // Create an updated copy of messages, marking all business messages as read
          const ultimateUpdatedMessages = existingMessages.map((msg: any) => {
            // Use the helper function to identify business messages
            const isBusiness = isBusinessMessage(msg);
                
            // Only update unread business messages - very flexible read check
            if (isBusiness && (msg.read !== true && msg.readTimestamp === undefined)) {
              console.log('Ultimate fallback - marking business message as read:', {
                id: msg._id?.toString?.() || String(msg._id),
                content: msg.content?.substring(0, 30),
                allFields: Object.keys(msg).join(',')
              });
              updated = true;
              
              // Create a new message object preserving ALL original properties
              const updatedMsg = { ...msg };
              
              // Set read status properties
              updatedMsg.read = true;
              updatedMsg.readTimestamp = readTimestamp;
              
              // Initialize readBy array if it doesn't exist
              const readBy = Array.isArray(msg.readBy) ? [...msg.readBy] : [];
              // Add userId if not already present
              if (!readBy.includes(userId)) {
                readBy.push(userId);
              }
              updatedMsg.readBy = readBy;
              
              return updatedMsg;
            }
            return msg;
          });
          
          if (updated) {
            // Update the entire messages array
            try {
              const ultimateUpdateResult = await chatRoomsCollection.updateOne(
                { _id: new ObjectId(chatRoomId) },
                { $set: { messages: ultimateUpdatedMessages } }
              );
              
              console.log('Ultimate fallback update result:', {
                matched: ultimateUpdateResult.matchedCount,
                modified: ultimateUpdateResult.modifiedCount
              });
              
              // Count actually changed messages for accurate reporting
              const changedCount = ultimateUpdatedMessages.filter((m: any) => 
                m.read === true && 
                typeof m.senderType === 'string' && 
                m.senderType.toUpperCase() === 'BUSINESS'
              ).length - existingMessages.filter((m: any) => 
                m.read === true && 
                typeof m.senderType === 'string' && 
                m.senderType.toUpperCase() === 'BUSINESS'
              ).length;
              
              totalUpdated += changedCount;
              console.log(`Ultimate fallback changed ${changedCount} messages`);
            } catch (error) {
              console.error('Error in ultimate fallback update:', error);
            }
          } else {
            console.log('Ultimate fallback - no business messages to update');
          }
        }
      } else {
        console.log('No messages found in chat room');
      }
      
      // Get the chat room after update to confirm changes
      const chatRoomAfter = await chatRoomsCollection.findOne({ 
        _id: new ObjectId(chatRoomId) 
      });
      
      // Calculate actual unread messages before and after
      const unreadBefore = chatRoomBefore?.messages?.filter(
        (msg: any) => isBusinessMessage(msg) && msg.read !== true
      ).length || 0;
      
      const unreadAfter = chatRoomAfter?.messages?.filter(
        (msg: any) => isBusinessMessage(msg) && msg.read !== true
      ).length || 0;
      
      console.log(`Unread count: Before=${unreadBefore}, After=${unreadAfter}, Difference=${unreadBefore - unreadAfter}`);
      console.log(`Total messages updated according to operations: ${totalUpdated}`);
      
      // Clear success indicator to display in logs
      if (unreadBefore > unreadAfter) {
        console.log('======================================================');
        console.log('✅ SUCCESS: Some business messages were marked as read!');
        console.log(`   Before: ${unreadBefore}, After: ${unreadAfter}`);
        console.log('======================================================');
      } else if (totalUpdated > 0 && unreadBefore === unreadAfter) {
        console.log('======================================================');
        console.log('⚠️ PARTIAL SUCCESS: Operations report success but unread count did not change');
        console.log(`   Operations succeeded: ${totalUpdated}, but unread count unchanged`);
        console.log('======================================================');
      } else if (unreadBefore === 0) {
        console.log('======================================================');
        console.log('ℹ️ NO ACTION NEEDED: No unread business messages to mark as read');
        console.log('======================================================');
      } else {
        console.log('======================================================');
        console.log('❌ FAILURE: Failed to mark business messages as read!');
        console.log(`   Unread count still: ${unreadAfter}, Operations tried: ${totalUpdated}`);
        console.log('======================================================');
      }
      
    return NextResponse.json({
      success: true,
        messagesUpdated: totalUpdated || 0,
        unreadCount: unreadAfter,
        unreadBefore,
        authType: 'user',
        authMode: authMode,
        source: 'Updated user mark-as-read logic'
    }, { status: 200 });
    }
    
    // This should never happen (redundant check)
    return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    
  } catch (error) {
    console.error('Error in mark-as-read API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to mark messages as read',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Close the database connection
    if (dbClient) {
      try {
        await dbClient.close();
        console.log('MongoDB connection closed');
      } catch (closeError) {
        console.error('Error closing MongoDB connection:', closeError);
      }
    }
  }
} 