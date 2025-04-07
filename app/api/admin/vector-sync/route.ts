import { NextRequest, NextResponse } from 'next/server';
import { getSyncStats, queueVectorStoreSync, retryFailedSyncs } from '@/app/lib/vector-sync-service';

// Simple admin check function (adjust based on your actual auth implementation)
async function isAdmin(req: NextRequest): Promise<boolean> {
  // This is a placeholder implementation
  // Replace with your actual admin authentication logic
  try {
    // Example: Check for admin cookie or header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return false;
    
    // For now, we'll use a simple check - replace with your actual auth logic
    // In a real app, you might verify a JWT token or session
    return authHeader.startsWith('Bearer admin_');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * GET /api/admin/vector-sync
 * Returns the current vector sync status and statistics
 */
export async function GET(req: NextRequest) {
  try {
    // Check if user is an admin
    if (!await isAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sync stats
    const stats = await getSyncStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting vector sync stats:', error);
    return NextResponse.json(
      { error: 'Failed to get vector sync stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/vector-sync
 * Triggers a manual sync for a business or retries failed syncs
 * 
 * Body:
 * - businessId: Optional business ID to sync
 * - retryFailed: Boolean to retry all failed syncs
 */
export async function POST(req: NextRequest) {
  try {
    // Check if user is an admin
    if (!await isAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { businessId, retryFailed } = body;
    
    if (retryFailed) {
      // Retry all failed syncs
      await retryFailedSyncs();
      return NextResponse.json({
        success: true,
        message: 'Retrying failed syncs',
        timestamp: new Date().toISOString()
      });
    } else if (businessId) {
      // Queue sync for specific business
      await queueVectorStoreSync(businessId, true);
      return NextResponse.json({
        success: true,
        message: `Queued sync for business ${businessId}`,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { error: 'Missing businessId or retryFailed parameter' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in vector sync API:', error);
    return NextResponse.json(
      { error: 'Failed to process sync request' },
      { status: 500 }
    );
  }
} 