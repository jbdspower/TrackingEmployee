import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Download, Eye } from "lucide-react";

interface RouteImageData {
  employeeId: string;
  sessionId: string;
  fullImage: string;
  thumbnail: string;
  routeInfo: {
    pointCount: number;
    startTime: string;
    endTime: string;
    startAddress: string;
    endAddress: string;
  };
  createdAt: string;
}

interface RouteImageViewerProps {
  routeData: RouteImageData | null;
  employeeName?: string;
}

export function RouteImageViewer({ routeData, employeeName }: RouteImageViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!routeData) {
    return (
      <div className="w-8 h-8 bg-muted rounded border flex items-center justify-center">
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = routeData.fullImage;
    link.download = `route_${routeData.employeeId}_${routeData.sessionId}_${new Date(routeData.createdAt).toISOString().split('T')[0]}.png`;
    link.click();
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <>
      {/* Thumbnail */}
      <div 
        className="w-8 h-8 rounded border cursor-pointer hover:ring-2 hover:ring-primary transition-all relative group"
        onClick={() => setIsModalOpen(true)}
        title="Click to view full route map"
      >
        <img
          src={routeData.thumbnail}
          alt={`Route for session ${routeData.sessionId}`}
          className="w-full h-full object-cover rounded"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          <Eye className="h-3 w-3 text-white" />
        </div>
      </div>

      {/* Full Image Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Route Map</span>
              {employeeName && <span>- {employeeName}</span>}
            </DialogTitle>
            <DialogDescription>
              Tracking session from {new Date(routeData.routeInfo.startTime).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Route Image */}
            <div className="relative border rounded-lg overflow-hidden bg-muted">
              <img
                src={routeData.fullImage}
                alt={`Full route map for session ${routeData.sessionId}`}
                className="w-full h-auto max-h-[500px] object-contain"
              />
            </div>

            {/* Route Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Session Info</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Session ID:</span>
                      <Badge variant="outline" className="text-xs">
                        {routeData.sessionId.split('_').pop()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Route Points:</span>
                      <span>{routeData.routeInfo.pointCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{formatDuration(routeData.routeInfo.startTime, routeData.routeInfo.endTime)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Timing</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-success" />
                      <span className="text-muted-foreground">Started:</span>
                      <span>{new Date(routeData.routeInfo.startTime).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-destructive" />
                      <span className="text-muted-foreground">Ended:</span>
                      <span>{new Date(routeData.routeInfo.endTime).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Locations</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <span className="text-muted-foreground font-medium">Start Location:</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4">
                        {routeData.routeInfo.startAddress}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-destructive rounded-full"></div>
                        <span className="text-muted-foreground font-medium">End Location:</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4">
                        {routeData.routeInfo.endAddress}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
