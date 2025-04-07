import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export default function VectorSyncManager() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch sync stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vector-sync');
      
      if (!response.ok) {
        throw new Error(`Error fetching stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data.stats);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Error fetching vector sync stats:', error);
      toast({
        title: 'Error fetching stats',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Queue sync for a business
  const queueSync = async (businessId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vector-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ businessId })
      });
      
      if (!response.ok) {
        throw new Error(`Error queueing sync: ${response.statusText}`);
      }
      
      const data = await response.json();
      toast({
        title: 'Sync queued',
        description: `Sync for business ${businessId} has been queued.`
      });
      
      // Refresh stats after a short delay
      setTimeout(fetchStats, 1000);
    } catch (error) {
      console.error('Error queueing sync:', error);
      toast({
        title: 'Error queueing sync',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Retry failed syncs
  const retryFailedSyncs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vector-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ retryFailed: true })
      });
      
      if (!response.ok) {
        throw new Error(`Error retrying syncs: ${response.statusText}`);
      }
      
      const data = await response.json();
      toast({
        title: 'Retrying failed syncs',
        description: `All failed syncs have been requeued.`
      });
      
      // Refresh stats after a short delay
      setTimeout(fetchStats, 1000);
    } catch (error) {
      console.error('Error retrying failed syncs:', error);
      toast({
        title: 'Error retrying syncs',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
    
    // Set up automatic refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Vector Store Sync Manager</CardTitle>
        <CardDescription>
          Monitor and manage real-time synchronization between MongoDB and the vector store
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {loading && !stats && (
          <div className="flex justify-center p-4">
            <p>Loading stats...</p>
          </div>
        )}
        
        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="text-sm font-medium">Queued Syncs</h3>
                <p className="text-2xl font-bold">{stats.queueSize}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="text-sm font-medium">Failed Syncs</h3>
                <p className="text-2xl font-bold">{stats.failedSyncs}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="text-sm font-medium">Total Vectors</h3>
                <p className="text-2xl font-bold">{stats.vectorStoreStats?.totalVectors || 0}</p>
              </div>
            </div>
            
            {stats.failedSyncs > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Failed Business IDs:</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.failedBusinessIds.map((id: string) => (
                    <Badge key={id} variant="destructive" className="cursor-pointer" onClick={() => queueSync(id)}>
                      {id}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Click on a business ID to retry its sync</p>
              </div>
            )}
            
            {stats.queueSize > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Currently Queued:</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.queuedBusinessIds.map((id: string) => (
                    <Badge key={id} variant="outline">{id}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {stats.vectorStoreStats?.businesses > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Businesses in Vector Store:</h3>
                <div className="max-h-40 overflow-y-auto p-2 border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Business ID</th>
                        <th className="text-left p-2">Vectors</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.vectorStoreStats.vectorsByBusiness || {}).map(([id, count]: [string, any]) => (
                        <tr key={id} className="border-b last:border-b-0">
                          <td className="p-2">{id}</td>
                          <td className="p-2">{count}</td>
                          <td className="p-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => queueSync(id)}
                              disabled={loading}
                            >
                              Sync
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {lastUpdated ? `Last updated: ${lastUpdated}` : 'Not yet updated'}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={fetchStats}
          >
            Refresh
          </Button>
          
          <Button
            variant="default"
            disabled={loading || !stats || stats.failedSyncs === 0}
            onClick={retryFailedSyncs}
          >
            Retry Failed Syncs
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 