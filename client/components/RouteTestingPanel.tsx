import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  testRouteTracking, 
  fullRouteTrackingTest, 
  RouteTrackingTest 
} from "@/lib/routeTrackingTest";
import { getBestAPIConfig, getAPIRecommendations } from "@/lib/apiKeyConfig";
import { 
  Play, 
  TestTube, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Settings,
  MapPin,
  Route,
  Ruler
} from "lucide-react";

export function RouteTestingPanel() {
  const [isRunningQuickTest, setIsRunningQuickTest] = useState(false);
  const [isRunningFullTest, setIsRunningFullTest] = useState(false);
  const [quickTestResult, setQuickTestResult] = useState<boolean | null>(null);
  const [testOutput, setTestOutput] = useState<string[]>([]);

  const apiConfig = getBestAPIConfig();
  const recommendations = getAPIRecommendations();

  const handleQuickTest = async () => {
    setIsRunningQuickTest(true);
    setTestOutput([]);
    
    // Capture console output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      const result = await testRouteTracking();
      setQuickTestResult(result);
      setTestOutput(logs);
    } catch (error) {
      setQuickTestResult(false);
      setTestOutput([...logs, `Error: ${error.message}`]);
    } finally {
      console.log = originalLog;
      setIsRunningQuickTest(false);
    }
  };

  const handleFullTest = async () => {
    setIsRunningFullTest(true);
    setTestOutput([]);
    
    // Capture console output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      const tester = new RouteTrackingTest();
      await tester.runAllTests();
      setTestOutput(logs);
    } catch (error) {
      setTestOutput([...logs, `Error: ${error.message}`]);
    } finally {
      console.log = originalLog;
      setIsRunningFullTest(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Route Tracking Test Panel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test and verify route tracking functionality after the fixes
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* API Configuration Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" />
            API Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current API</span>
                <Badge variant={apiConfig.hasKey ? "default" : "secondary"}>
                  {apiConfig.type.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {apiConfig.description}
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">API Status</span>
                <Badge variant={apiConfig.hasKey ? "default" : "destructive"}>
                  {apiConfig.hasKey ? "Configured" : "Free Tier"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {apiConfig.hasKey 
                  ? "Using configured API key" 
                  : "Using free public APIs (limited)"}
              </p>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-4 w-4" />
            Run Tests
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Button 
                onClick={handleQuickTest}
                disabled={isRunningQuickTest}
                className="w-full"
                variant="outline"
              >
                {isRunningQuickTest ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Running...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Quick Test
                  </div>
                )}
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Tests basic distance calculation and API routing (~30 seconds)
              </p>
              
              {quickTestResult !== null && (
                <div className="flex items-center gap-2 mt-2">
                  {quickTestResult ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">Test Passed</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">Test Failed</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleFullTest}
                disabled={isRunningFullTest}
                className="w-full"
              >
                {isRunningFullTest ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Running...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    Full Test Suite
                  </div>
                )}
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Comprehensive testing of all route tracking features (~2 minutes)
              </p>
            </div>
          </div>
        </div>

        {/* Test Output */}
        {testOutput.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Output</h3>
            
            <div className="p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {testOutput.join('\n')}
              </pre>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {!apiConfig.hasKey && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recommendations
            </h3>
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm mb-3">
                You're using free APIs which may be limited. For better reliability:
              </p>
              
              <div className="space-y-2">
                {recommendations.recommendations
                  .filter(rec => rec.recommended)
                  .map((rec, index) => (
                    <div key={index} className="text-sm">
                      <strong>{rec.service}:</strong> {rec.freeLimit} free, {rec.paidOptions}
                      <br />
                      <code className="text-xs bg-gray-100 px-1 rounded">{rec.setup}</code>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Issues Fixed */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Issues Fixed
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">✅ Distance Calculation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fixed 0 distance showing for 40km routes</li>
                <li>• Improved GPS point filtering (5m instead of 8m)</li>
                <li>• Better distance accumulation logic</li>
              </ul>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">✅ Route Visualization</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fixed "Not enough points" error</li>
                <li>• Simplified route display logic</li>
                <li>• Better fallback for single GPS points</li>
              </ul>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">✅ API Reliability</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Added timeout handling</li>
                <li>• Improved error handling</li>
                <li>• Better fallback strategies</li>
              </ul>
            </div>
            
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">✅ Performance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Reduced API calls for long routes</li>
                <li>• Better caching strategies</li>
                <li>• More efficient GPS processing</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
