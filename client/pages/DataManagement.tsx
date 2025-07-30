import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Calendar,
  BarChart3
} from "lucide-react";
import { HttpClient } from "@/lib/httpClient";

interface DataStatus {
  employeeId: string;
  mongoDB: {
    meetings: number;
    history: number;
    employees: number;
    trackingSessions: number;
    sampleMeeting: any;
    sampleHistory: any;
  };
  inMemory: {
    meetings: number;
    sampleMeeting: any;
  };
}

interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    totalMeetingsInMongoDB: number;
    totalHistoryInMongoDB: number;
    meetingsSynced: number;
    historySynced: number;
    employeeId: string;
  };
}

export default function DataManagement() {
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    fetchDataStatus();
  }, []);

  const fetchDataStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await HttpClient.get("/api/data-status");
      
      if (response.ok) {
        const data = await response.json();
        setDataStatus(data);
        console.log("Data status:", data);
      } else {
        throw new Error(`Failed to fetch data status: ${response.status}`);
      }
    } catch (err) {
      console.error("Error fetching data status:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setError(null);
      
      const response = await HttpClient.post("/api/data-sync", {});
      
      if (response.ok) {
        const result = await response.json();
        setSyncResult(result);
        console.log("Sync result:", result);
        
        // Refresh data status after sync
        await fetchDataStatus();
      } else {
        // Don't try to read response body on error as it might cause "body stream already read" error
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error syncing data:", err);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const clearLocationCache = async () => {
    try {
      setClearingCache(true);
      setError(null);
      setCacheCleared(false);

      const response = await HttpClient.post("/api/employees/clear-cache", {});

      if (response.ok) {
        const result = await response.json();
        setCacheCleared(true);
        console.log("Location cache cleared:", result.message);
      } else {
        throw new Error(`Cache clear failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear location cache");
    } finally {
      setClearingCache(false);
    }
  };

  const getStatusColor = (mongoCount: number, memoryCount: number) => {
    if (mongoCount === 0 && memoryCount > 0) return "text-yellow-600";
    if (mongoCount > 0) return "text-green-600";
    return "text-gray-600";
  };

  const getStatusIcon = (mongoCount: number, memoryCount: number) => {
    if (mongoCount === 0 && memoryCount > 0) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    if (mongoCount > 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Database className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading data status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground">
              Monitor and synchronize MongoDB data storage
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={fetchDataStatus} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={syncData}
              disabled={syncing}
              className="bg-primary hover:bg-primary/90"
            >
              <Database className="h-4 w-4 mr-2" />
              {syncing ? "Syncing..." : "Sync Data"}
            </Button>
            <Button
              onClick={clearLocationCache}
              disabled={clearingCache}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {clearingCache ? "Clearing..." : "Clear Location Cache"}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sync Result */}
        {syncResult && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{syncResult.message}</strong>
              <div className="mt-2 text-sm">
                <p>✅ Meetings in MongoDB: {syncResult.stats.totalMeetingsInMongoDB}</p>
                <p>✅ History in MongoDB: {syncResult.stats.totalHistoryInMongoDB}</p>
                <p>📝 Meetings synced: {syncResult.stats.meetingsSynced}</p>
                <p>📝 History synced: {syncResult.stats.historySynced}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cache Cleared Result */}
        {cacheCleared && (
          <Alert className="border-orange-200 bg-orange-50">
            <CheckCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Location cache cleared successfully!</strong>
              <div className="mt-2 text-sm">
                <p>🔄 All employees will now use real GPS location data</p>
                <p>📍 No more hardcoded cities (Delhi, Mumbai, etc.)</p>
                <p>💡 Refresh the employee list to see updated locations</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Data Overview */}
        {dataStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MongoDB Meetings</CardTitle>
                {getStatusIcon(dataStatus.mongoDB.meetings, dataStatus.inMemory.meetings)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(dataStatus.mongoDB.meetings, dataStatus.inMemory.meetings)}`}>
                  {dataStatus.mongoDB.meetings}
                </div>
                <p className="text-xs text-muted-foreground">
                  In-memory: {dataStatus.inMemory.meetings}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meeting History</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dataStatus.mongoDB.history}
                </div>
                <p className="text-xs text-muted-foreground">Historical records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dataStatus.mongoDB.employees}
                </div>
                <p className="text-xs text-muted-foreground">Employee records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tracking Sessions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {dataStatus.mongoDB.trackingSessions}
                </div>
                <p className="text-xs text-muted-foreground">Location sessions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sample Data Preview */}
        {dataStatus && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sample Meeting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample Meeting Data</CardTitle>
              </CardHeader>
              <CardContent>
                {dataStatus.mongoDB.sampleMeeting ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-xs">{dataStatus.mongoDB.sampleMeeting.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee:</span>
                      <span>{dataStatus.mongoDB.sampleMeeting.employeeId.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline">{dataStatus.mongoDB.sampleMeeting.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead ID:</span>
                      <span>{dataStatus.mongoDB.sampleMeeting.leadId || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Has Details:</span>
                      <Badge variant={dataStatus.mongoDB.sampleMeeting.hasDetails ? "default" : "secondary"}>
                        {dataStatus.mongoDB.sampleMeeting.hasDetails ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No meeting data found</p>
                )}
              </CardContent>
            </Card>

            {/* Sample History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample History Data</CardTitle>
              </CardHeader>
              <CardContent>
                {dataStatus.mongoDB.sampleHistory ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-xs">{dataStatus.mongoDB.sampleHistory.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee:</span>
                      <span>{dataStatus.mongoDB.sampleHistory.employeeId.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customers:</span>
                      <Badge variant="outline">{dataStatus.mongoDB.sampleHistory.hasCustomers ? "Yes" : "No"}</Badge>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-muted-foreground">Discussion:</span>
                      <span className="text-xs bg-muted p-2 rounded">
                        {dataStatus.mongoDB.sampleHistory.discussion || "No discussion"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No history data found</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommendations */}
        {dataStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataStatus.mongoDB.meetings === 0 && dataStatus.inMemory.meetings > 0 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Data Sync Needed:</strong> You have {dataStatus.inMemory.meetings} meetings in memory but none in MongoDB. Click "Sync Data" to fix this.
                    </AlertDescription>
                  </Alert>
                )}
                
                {dataStatus.mongoDB.meetings > dataStatus.mongoDB.history && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Missing History:</strong> You have more meetings ({dataStatus.mongoDB.meetings}) than history entries ({dataStatus.mongoDB.history}). Some meetings might not have been completed with proper details.
                    </AlertDescription>
                  </Alert>
                )}
                
                {dataStatus.mongoDB.meetings > 0 && dataStatus.mongoDB.history > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Data Looks Good:</strong> Your MongoDB storage is working properly with {dataStatus.mongoDB.meetings} meetings and {dataStatus.mongoDB.history} history entries.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
