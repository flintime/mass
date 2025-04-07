import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

// Promisify exec
const execAsync = util.promisify(exec);

/**
 * API endpoint to trigger Vector Store synchronization
 * This allows admins to manually trigger a sync of all businesses or a specific business
 * 
 * POST /api/admin/sync-vector-store
 * - No body: Sync all businesses
 * - Body: { businessId: string } - Sync a specific business
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get the root directory
    const rootDir = process.cwd();
    
    let result;
    let message = '';
    let scriptCommand = 'npx tsx scripts/sync-vector-store.ts';
    
    // Check if a specific business ID was provided
    try {
      const body = await req.json();
      if (body && body.businessId) {
        // Sync a specific business by passing the business ID as an environment variable
        const businessId = body.businessId;
        console.log(`Admin-triggered sync for business ${businessId}`);
        scriptCommand = `BUSINESS_ID=${businessId} npx tsx scripts/sync-vector-store.ts`;
      } else {
        console.log('Admin-triggered sync for all businesses');
      }
    } catch (parseError) {
      console.log('Admin-triggered sync for all businesses (default)');
    }
    
    // Run the sync script as a child process
    console.log(`Running: ${scriptCommand}`);
    const { stdout, stderr } = await execAsync(scriptCommand, { cwd: rootDir });
    
    if (stderr) {
      console.error('Stderr from sync script:', stderr);
    }
    
    // Parse the output for results
    message = 'Vector store synchronization completed successfully';
    
    // Check stdout for success/failure counts
    const successMatch = stdout.match(/Successfully synced (\d+) businesses? with \d+ documents/g);
    const successCount = successMatch ? successMatch.length : 0;
    
    const totalMatch = stdout.match(/Found (\d+) businesses to sync/);
    const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;
    
    result = {
      total: totalCount,
      success: successCount,
      failed: totalCount - successCount
    };
    
    // Return success response
    return NextResponse.json({
      success: true,
      message,
      result
    });
    
  } catch (error) {
    // Log the error
    console.error('Error in Vector Store sync API:', error);
    
    // Return error response
    return NextResponse.json(
      { success: false, error: 'Failed to sync with Vector Store: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 