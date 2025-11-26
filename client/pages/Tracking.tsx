import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationTracker } from "@/components/LocationTracker";
import { EmployeeMap } from "@/components/EmployeeMap";
import { StartMeetingModal } from "@/components/StartMeetingModal";
import { EndMeetingModal } from "@/components/EndMeetingModal";
import { MeetingHistory } from "@/components/MeetingHistory";
import { RouteSnapshotCapture } from "@/components/RouteSnapshotCapture";
import { RouteSnapshotHistory } from "@/components/RouteSnapshotHistory";
import { TodaysMeetings, FollowUpMeeting, getPendingTodaysMeetings } from "@/components/TodaysMeetings"; // Import the component
import { HttpClient } from "@/lib/httpClient";
import { useToast } from "@/hooks/use-toast";
import {
  Employee,
  MeetingLog,
  MeetingDetails,
  TrackingSession,
  CreateRouteSnapshotRequest,
  MeetingSnapshot,
  MapBounds,
} from "@shared/api";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Mail,
  Navigation,
  Calendar,
  Plus,
  MessageSquare,
  Camera,
  History,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function Tracking() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [meetings, setMeetings] = useState<MeetingLog[]>([]);
  const [todaysFollowUpMeetings, setTodaysFollowUpMeetings] = useState<FollowUpMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [isStartMeetingModalOpen, setIsStartMeetingModalOpen] = useState(false);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isEndMeetingModalOpen, setIsEndMeetingModalOpen] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [currentTrackingSession, setCurrentTrackingSession] = useState<TrackingSession | null>(null);
  const [isMeetingHistoryOpen, setIsMeetingHistoryOpen] = useState(false);
  const [isSnapshotCaptureOpen, setIsSnapshotCaptureOpen] = useState(false);
  const [isSnapshotHistoryOpen, setIsSnapshotHistoryOpen] = useState(false);
  const [startedMeetingMap, setStartedMeetingMap] = useState<Record<string, string>>({});

  // Debug: Log startedMeetingMap changes
  useEffect(() => {
    console.log("🗺️ startedMeetingMap updated:", startedMeetingMap);
  }, [startedMeetingMap]);
  const [startedFollowUpData, setStartedFollowUpData] = useState<any>(null);
  // Store follow-up data by meeting ID for easy retrieval
  const [followUpDataMap, setFollowUpDataMap] = useState<Record<string, any>>({});
  const [followUpMeetingIds, setFollowUpMeetingIds] = useState<Set<string>>(new Set());
  const [refreshTodaysMeetings, setRefreshTodaysMeetings] = useState<number>(0);

  // Track meetings state changes for debugging
  useEffect(() => {
    console.log("🔄 Meetings state changed:", {
      count: meetings.length,
      meetings: meetings.map(m => ({ id: m.id, status: m.status, client: m.clientName })),
      hasActive: meetings.some(m => m.status === "in-progress" || m.status === "started")
    });
  }, [meetings]);

  useEffect(() => {
    if (!employeeId) {
      navigate("/");
      return;
    }

    const initializeData = async () => {
      try {
        await Promise.all([fetchEmployee(), fetchMeetings()]);
      } catch (error) {
        console.error("Failed to initialize tracking data:", error);
      }
    };

    initializeData();
  }, [employeeId, navigate]);

  const fetchEmployee = async (retryCount = 0) => {
    try {
      console.log("Fetching employee:", { employeeId, retryCount });

      const response = await HttpClient.get(`/api/employees/${employeeId}`);

      if (response.ok) {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            setEmployee(data);
            console.log("Employee data fetched successfully:", data);
          } else {
            const textData = await response.text();
            console.error("Server returned non-JSON response:", textData.substring(0, 200));
            setEmployee(null);
          }
        } catch (jsonError) {
          console.error("Error parsing employee response:", jsonError);
          setEmployee(null);
        }
      } else {
        console.error(
          `Failed to fetch employee: ${response.status} ${response.statusText}`,
        );
        setEmployee(null);
      }
    } catch (error) {
      console.error("Error fetching employee:", error);

      if (
        retryCount < 1 &&
        error instanceof TypeError &&
        (error.message.includes("fetch") || error.message.includes("body stream"))
      ) {
        console.log("Retrying employee fetch after network error...");
        setTimeout(() => fetchEmployee(retryCount + 1), 2000);
        return;
      }

      setEmployee(null);
    }
  };

  const fetchMeetings = async (retryCount = 0) => {
    try {
      console.log("Fetching meetings:", { employeeId, retryCount });

      const response = await HttpClient.get(
        `/api/meetings?employeeId=${employeeId}&limit=5`,
      );

      if (response.ok) {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            const fetchedMeetings = data.meetings || [];
            setMeetings(fetchedMeetings);
            console.log("Meetings data fetched successfully:", data);

            // 🔹 CRITICAL FIX: Restore startedMeetingMap from active meetings
            // This ensures the UI shows "End Meeting" button after page refresh
            const activeMeeting = fetchedMeetings.find(
              (m: MeetingLog) => m.status === "in-progress" || m.status === "started"
            );

            if (activeMeeting) {
              console.log("🔄 Found active meeting after refresh:", activeMeeting.id);
              
              // Check if this meeting has a followUpId (was started from follow-up)
              if (activeMeeting.followUpId) {
                console.log("🔄 Restoring startedMeetingMap for follow-up meeting:", activeMeeting.followUpId);
                
                // Restore the mapping between follow-up ID and meeting ID
                setStartedMeetingMap(prev => ({
                  ...prev,
                  [activeMeeting.followUpId!]: activeMeeting.id
                }));
                
                // Also set the active meeting ID
                setActiveMeetingId(activeMeeting.id);
              } else {
                console.log("🔄 Active meeting found but no followUpId, setting activeMeetingId only");
                setActiveMeetingId(activeMeeting.id);
              }
            } else {
              console.log("✅ No active meetings found");
              setStartedMeetingMap({});
              setActiveMeetingId(null);
            }
          } else {
            const textData = await response.text();
            console.error("Server returned non-JSON response for meetings:", textData.substring(0, 200));
            setMeetings([]);
          }
        } catch (jsonError) {
          console.error("Error parsing meetings response:", jsonError);
          setMeetings([]);
        }
      } else {
        console.error(
          `Failed to fetch meetings: ${response.status} ${response.statusText}`,
        );
        setMeetings([]);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);

      if (
        retryCount < 1 &&
        error instanceof TypeError &&
        (error.message.includes("fetch") || error.message.includes("body stream"))
      ) {
        console.log("Retrying meetings fetch after network error...");
        setTimeout(() => fetchMeetings(retryCount + 1), 2000);
        return;
      }

      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle when today's meetings are fetched
  const handleTodaysMeetingsFetched = (meetings: FollowUpMeeting[]) => {
    console.log("Today's follow-up meetings fetched:", meetings.length);
    setTodaysFollowUpMeetings(meetings);
  };

  // Handle starting a meeting from the Today's Meetings component
  const handleStartMeetingFromFollowUp = (meeting: FollowUpMeeting) => {
    console.log("🚀 Attempting to start meeting from follow-up:", meeting.companyName);
    console.log("📋 Current meetings:", meetings.map(m => ({ id: m.id, status: m.status, client: m.clientName })));
    console.log("📊 Total meetings:", meetings.length);
    
    // Check if there's already an active meeting
    const activeMeeting = meetings.find(
      (m) => m.status === "in-progress" || m.status === "started"
    );

    console.log("🔍 Active meeting check result:", activeMeeting ? `Found: ${activeMeeting.id}` : "None");

    if (activeMeeting) {
      console.log("❌ BLOCKED: Active meeting exists:", activeMeeting.id);
      toast({
        title: "Cannot Start Meeting",
        description: "You already have an active meeting. Please complete it before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("✅ No active meeting found, proceeding to start...");
    
    // Prepare meeting data for the meeting
    const meetingData = {
      clientName: meeting.customerName,
      reason: `Follow-up meeting - ${meeting.type}`,
      notes: meeting.remark || `Meeting with ${meeting.customerName} from ${meeting.companyName}`,
      leadId: meeting.leadId,
      leadInfo: {
        id: meeting.leadId,
        companyName: meeting.companyName,
        contactName: meeting.customerName
      }
    };

    // Start the meeting directly without showing modal
    startMeetingFromFollowUp(meetingData, meeting._id);
  };

  const handleLocationUpdate = (lat: number, lng: number, accuracy: number) => {
    console.log("Location updated:", { lat, lng, accuracy });
    fetchEmployee();
  };

  const openInExternalMap = (lat: number, lng: number, address: string) => {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const appleMapUrl = `https://maps.apple.com/?q=${lat},${lng}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.open(appleMapUrl, "_blank");
    } else {
      window.open(googleMapsUrl, "_blank");
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleEmail = (email: string, employeeName: string) => {
    const subject = encodeURIComponent(
      `Regarding Field Operations - ${employeeName}`,
    );
    const body = encodeURIComponent(
      `Hi ${employeeName.split(" ")[0]},\n\nI wanted to follow up regarding your current field operations.\n\nBest regards`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSendMessage = (phoneNumber: string, employeeName: string) => {
    const message = encodeURIComponent(
      `Hi ${employeeName.split(" ")[0]}, checking in on your current location and status.`,
    );
    window.location.href = `sms:${phoneNumber}?body=${message}`;
  };

  const [isEndingMeeting, setIsEndingMeeting] = useState<string | null>(null);

  const handleEndMeetingClick = (meetingId: string) => {
    console.log("handleEndMeetingClick called with meetingId:", meetingId);
    setActiveMeetingId(meetingId);
    setIsEndMeetingModalOpen(true);
  };

  const handleEndMeetingFromFollowUp = (followUpId: string, meetingId: string) => {
    console.log("🔴 handleEndMeetingFromFollowUp called with:", { followUpId, meetingId });
    console.log("📊 Current meetings:", meetings.map(m => ({ id: m.id, status: m.status, client: m.clientName })));
    console.log("🗺️ startedMeetingMap:", startedMeetingMap);
    console.log("📋 followUpDataMap:", Object.keys(followUpDataMap));
    
    // If meetingId is empty or not provided, try to find the active meeting
    let finalMeetingId = meetingId;
    if (!finalMeetingId || finalMeetingId === "") {
      console.log("⚠️ No meetingId provided, searching for active meeting...");
      console.log("Available meetings:", meetings);
      
      const activeMeeting = meetings.find(
        (m) => m.status === "in-progress" || m.status === "started"
      );
      
      if (activeMeeting) {
        finalMeetingId = activeMeeting.id;
        console.log("✅ Found active meeting by status:", finalMeetingId);
      } else {
        // Try to find by followUpId in startedMeetingMap
        if (followUpId && startedMeetingMap[followUpId]) {
          finalMeetingId = startedMeetingMap[followUpId];
          console.log("✅ Found meeting ID from startedMeetingMap:", finalMeetingId);
        } else {
          console.error("❌ No active meeting found!");
          console.error("Available meeting statuses:", meetings.map(m => m.status));
          toast({
            title: "Error",
            description: "Cannot find active meeting. Please try refreshing the page.",
            variant: "destructive",
          });
          return; // Don't open modal if we can't find the meeting
        }
      }
    }
    
    console.log("🎯 Final meeting ID:", finalMeetingId);
    
    // Try to get follow-up data from our stored map first (by meeting ID)
    let followUpData = followUpDataMap[finalMeetingId];
    console.log("📋 Follow-up data from map:", !!followUpData);
    
    // If not found in map, try to find it in todaysFollowUpMeetings by followUpId
    if (!followUpData && followUpId) {
      followUpData = todaysFollowUpMeetings.find(m => m._id === followUpId);
      console.log("📋 Found follow-up data from todaysFollowUpMeetings:", !!followUpData);
    }
    
    if (followUpData) {
      console.log("✅ Setting follow-up data for modal:", followUpData);
      setStartedFollowUpData(followUpData);
    } else {
      console.warn("⚠️ No follow-up data found for meeting:", finalMeetingId);
    }
    
    setActiveMeetingId(finalMeetingId);
    setIsEndMeetingModalOpen(true);
  };

  const handleEndMeetingAttempt = () => {
    console.log("End meeting attempt. Employee status:", employee?.status, "Available meetings:", meetings);

    const activeMeeting = meetings.find(
      (meeting) => meeting.status === "in-progress",
    );

    if (activeMeeting) {
      handleEndMeetingClick(activeMeeting.id);
    } else {
      console.error("No active meeting found to end. Available meetings:", meetings);
      alert("No active meeting found for this employee. Please start a meeting first.");
    }
  };

const handleEndMeetingWithDetails = async (
  meetingDetails: MeetingDetails,
) => {
  console.log("🔴 handleEndMeetingWithDetails called with:", {
    activeMeetingId,
    meetingDetails,
    hasCustomers: meetingDetails.customers?.length > 0,
    hasDiscussion: !!meetingDetails.discussion
  });
  
  if (!activeMeetingId) {
    console.error("❌ Cannot end meeting: No activeMeetingId set!");
    toast({
      title: "Error",
      description: "No active meeting ID found. Please try again.",
      variant: "destructive",
    });
    return;
  }

  setIsEndingMeeting(activeMeetingId);
  try {
    console.log(
      "Ending meeting with details:",
      activeMeetingId,
      meetingDetails,
    );

    // 🔹 CRITICAL FIX: Get fresh location before ending meeting
    let endLocation = null;
    try {
      console.log("📍 Fetching fresh location for meeting end...");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
          }
        );
      });

      let address = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      
      // Get human-readable address from coordinates
      try {
        console.log("🗺️ Fetching address for meeting end location...");
        const addressResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'EmployeeTrackingApp/1.0'
            }
          }
        );
        
        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          address = addressData.display_name || address;
          console.log("✅ Meeting end address resolved:", address);
        }
      } catch (addressError) {
        console.warn("⚠️ Failed to get address, using coordinates:", addressError);
      }

      endLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: address,
        timestamp: new Date().toISOString(),
      };
      console.log("✅ Fresh end location obtained:", endLocation);
    } catch (locationError) {
      console.warn("⚠️ Failed to get fresh location for meeting end:", locationError);
      // Continue without end location - better to save the meeting than fail completely
    }

    const response = await HttpClient.put(
      `/api/meetings/${activeMeetingId}`,
      {
        status: "completed",
        endTime: new Date().toISOString(),
        meetingDetails,
        endLocation, // Include end location
      },
    );

    if (response.ok) {
      console.log("Meeting ended successfully");

      // Find the follow-up meeting that was started
      const followUpMeetingId = Object.keys(startedMeetingMap).find(
        key => startedMeetingMap[key] === activeMeetingId
      );

      // Update follow-up meeting status to "Approved" in the backend
      if (followUpMeetingId) {
        try {
          console.log("Updating follow-up status for:", followUpMeetingId);
          
          const followUpResponse = await fetch(
      `https://jbdspower.in/LeafNetServer/api/updateFollowUp/${followUpMeetingId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetingStatus: "complete" }),
      }
    );

          if (followUpResponse.ok) {
            console.log("Follow-up meeting status updated to 'complete'");
          } else {
            console.error("Failed to update follow-up status:", followUpResponse.status);
          }
        } catch (followUpError) {
          console.error("Error updating follow-up status:", followUpError);
        }
      }

      // Rest of your existing code for history and state updates...
      try {
        const currentMeeting = meetings.find(m => m.id === activeMeetingId);

        console.log("Attempting to add meeting to history with details:", {
          sessionId: currentTrackingSession?.id || `manual_${Date.now()}`,
          employeeId,
          meetingDetails,
          leadId: currentMeeting?.leadId,
          leadInfo: currentMeeting?.leadInfo,
        });

        const historyResponse = await HttpClient.post(
          "/api/meeting-history",
          {
            sessionId: currentTrackingSession?.id || `manual_${Date.now()}`,
            employeeId,
            meetingDetails,
            leadId: currentMeeting?.leadId,
            leadInfo: currentMeeting?.leadInfo,
          },
        );

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log("Meeting added to history successfully:", historyData);
        } else {
          const errorText = await historyResponse.text();
          console.error("Failed to add meeting to history:", historyResponse.status, errorText);
        }
      } catch (historyError) {
        console.error("Error adding meeting to history:", historyError);
      }

      // Remove from started meeting map when meeting is ended
      setStartedMeetingMap(prev => {
        const newMap = { ...prev };
        // Find and remove the follow-up ID that maps to this meeting ID
        Object.keys(newMap).forEach(key => {
          if (newMap[key] === activeMeetingId) {
            delete newMap[key];
          }
        });
        return newMap;
      });

      // Remove from follow-up data map
      setFollowUpDataMap(prev => {
        const newMap = { ...prev };
        delete newMap[activeMeetingId];
        return newMap;
      });

      // Remove from follow-up meeting IDs
      setFollowUpMeetingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(activeMeetingId);
        return newSet;
      });

      // Trigger refresh of Today's meetings to get updated status from API
      setRefreshTodaysMeetings(prev => prev + 1);

      await HttpClient.put(`/api/employees/${employeeId}/status`, {
        status: "active",
      });

      await Promise.all([fetchMeetings(), fetchEmployee()]);
    } else {
      const errorText = await response.text();
      console.error("Failed to end meeting:", response.status, errorText);
      throw new Error(`Failed to end meeting: ${errorText}`);
    }
  } catch (error) {
    console.error("Error ending meeting:", error);
    throw error;
  } finally {
    setIsEndingMeeting(null);
    setActiveMeetingId(null);
  }
};

  const startMeeting = async (meetingData: {
    clientName: string;
    reason: string;
    notes: string;
    leadId?: string;
    leadInfo?: {
      id: string;
      companyName: string;
      contactName: string;
    };
  }) => {
    if (!employee) return;

    setIsStartingMeeting(true);
    try {
      const response = await HttpClient.post("/api/meetings", {
        employeeId: employee.id,
        location: {
          lat: employee.location.lat,
          lng: employee.location.lng,
          address: employee.location.address,
        },
        clientName: meetingData.clientName,
        notes: `${meetingData.reason}${meetingData.notes ? ` - ${meetingData.notes}` : ""}`,
        leadId: meetingData.leadId,
        leadInfo: meetingData.leadInfo,
      });

      if (response.ok) {
        const createdMeeting = await response.json();
        
        console.log("✅ Meeting created successfully:", createdMeeting.id);
        
        // IMMEDIATELY add the meeting to the local state to prevent race conditions
        setMeetings(prev => {
          console.log("📝 Adding meeting to state:", createdMeeting.id);
          return [...prev, createdMeeting];
        });
        
        // DON'T fetch meetings after starting - it will replace the state and lose the meeting
        // The meeting is already added to state above, no need to fetch
        // setTimeout(() => {
        //   console.log("🔄 Fetching meetings after delay to sync with server...");
        //   fetchMeetings();
        // }, 1000);
        await axios.put(`/api/employees/${employeeId}/status`, {
          status: "meeting",
        });
        fetchEmployee();
        setIsStartMeetingModalOpen(false);
        
        // Show success toast
        toast({
          title: "Meeting Started",
          description: `Meeting with ${meetingData.clientName} has been started`,
        });
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: "Failed to start meeting" }));
        toast({
          title: "Cannot Start Meeting",
          description: errorData.error || "Failed to start meeting",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to start meeting",
        variant: "destructive",
      });
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const startMeetingFromFollowUp = async (
    meetingData: {
      clientName: string;
      reason: string;
      notes: string;
      leadId?: string;
      leadInfo?: {
        id: string;
        companyName: string;
        contactName: string;
      };
    },
    followUpId: string
  ) => {
    if (!employee) return;

    setIsStartingMeeting(true);
    try {
      // Find and store the full follow-up data before starting the meeting
      const followUpData = todaysFollowUpMeetings.find(m => m._id === followUpId);
      console.log("📋 Storing follow-up data for meeting:", followUpData);
      
      const response = await HttpClient.post("/api/meetings", {
        employeeId: employee.id,
        location: {
          lat: employee.location.lat,
          lng: employee.location.lng,
          address: employee.location.address,
        },
        clientName: meetingData.clientName,
        notes: `${meetingData.reason}${meetingData.notes ? ` - ${meetingData.notes}` : ""}`,
        leadId: meetingData.leadId,
        leadInfo: meetingData.leadInfo,
        followUpId: followUpId, // 🔹 Store the follow-up meeting ID
        externalMeetingStatus: "meeting on-going", // Initial status from external API
      });

      if (response.ok) {
        const createdMeeting = await response.json();
        
        console.log("✅ Meeting created successfully:", createdMeeting.id);
        
        // IMMEDIATELY add the meeting to the local state to prevent race conditions
        setMeetings(prev => {
          console.log("📝 Adding meeting to state:", createdMeeting.id);
          return [...prev, createdMeeting];
        });
        
        // Track the mapping of follow-up ID to created meeting ID
        setStartedMeetingMap(prev => ({
          ...prev,
          [followUpId]: createdMeeting.id
        }));
        
        // Store the follow-up data mapped by meeting ID for later retrieval
        if (followUpData) {
          setFollowUpDataMap(prev => ({
            ...prev,
            [createdMeeting.id]: followUpData
          }));
          console.log("✅ Stored follow-up data for meeting ID:", createdMeeting.id);
        }

        // Notify backend/external API that follow-up meeting has started (meeting on-going)
        try {
  const resp = await fetch(
    `https://jbdspower.in/LeafNetServer/api/updateFollowUp/${followUpId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meetingStatus: "meeting on-going",
      }),
    }
  );

  if (resp.ok) {
    console.log(
      "Updated follow-up meetingStatus to 'meeting on-going' for:",
      followUpId
    );
  } else {
    console.warn("Failed to update follow-up meetingStatus:", resp.status);
  }
} catch (err) {
  console.error(
    "Failed to update follow-up meetingStatus to meeting on-going:",
    err
  );
}


        // Track this meeting as coming from a follow-up
        setFollowUpMeetingIds(prev => new Set([...prev, createdMeeting.id]));

        // DON'T fetch meetings after starting - it will replace the state and lose the meeting
        // The meeting is already added to state above, no need to fetch
        // setTimeout(() => {
        //   console.log("🔄 Fetching meetings after delay to sync with server...");
        //   fetchMeetings();
        // }, 1000);
        await axios.put(`/api/employees/${employeeId}/status`, {
          status: "meeting",
        });
        fetchEmployee();
        
        // Show success toast - don't open Start modal
        toast({
          title: "Meeting Started",
          description: `Meeting with ${meetingData.clientName} has been started`,
        });
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: "Failed to start meeting" }));
        toast({
          title: "Cannot Start Meeting",
          description: errorData.error || "Failed to start meeting",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to start meeting",
        variant: "destructive",
      });
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const openStartMeetingModal = () => {
    // Check if there's already an active meeting
    const activeMeeting = meetings.find(
      (m) => m.status === "in-progress" || m.status === "started"
    );

    if (activeMeeting) {
      toast({
        title: "Cannot Start Meeting",
        description: "You already have an active meeting. Please complete it before starting a new one.",
        variant: "destructive",
      });
      console.log("Blocked: Active meeting exists:", activeMeeting.id);
      return;
    }

    setIsStartMeetingModalOpen(true);
  };

  const handleTrackingSessionStart = async (session: TrackingSession) => {
    setCurrentTrackingSession(session);
    console.log("📍 Tracking session started:", session);
    
    // 🔹 Save tracking session to server
    try {
      const response = await HttpClient.post("/api/tracking-sessions", {
        id: session.id,
        employeeId: session.employeeId,
        startTime: session.startTime,
        startLocation: session.startLocation,
        route: session.route || [],
        totalDistance: session.totalDistance || 0,
        status: session.status,
      });

      if (response.ok) {
        const savedSession = await response.json();
        console.log("✅ Tracking session saved to server:", savedSession);
      } else {
        console.error("❌ Failed to save tracking session:", response.status);
      }
    } catch (error) {
      console.error("❌ Error saving tracking session:", error);
    }
  };

  const handleTrackingSessionEnd = async (session: TrackingSession) => {
    setCurrentTrackingSession(session);
    console.log("📍 Tracking session ended:", session);
    
    // 🔹 Update tracking session on server with end data
    try {
      const response = await HttpClient.put(`/api/tracking-sessions/${session.id}`, {
        endTime: session.endTime,
        endLocation: session.endLocation,
        route: session.route || [],
        totalDistance: session.totalDistance || 0,
        duration: session.duration,
        status: session.status,
      });

      if (response.ok) {
        const updatedSession = await response.json();
        console.log("✅ Tracking session updated on server:", updatedSession);
      } else {
        console.error("❌ Failed to update tracking session:", response.status);
      }
    } catch (error) {
      console.error("❌ Error updating tracking session:", error);
    }

    console.log("Auto-snapshot conditions:", {
      hasEmployee: !!employee,
      sessionStatus: session.status,
      shouldCreateSnapshot: employee && session.status === "completed"
    });

    if (employee && session.status === "completed") {
      try {
        console.log("Auto-creating route snapshot for completed tracking session");
        await autoCreateRouteSnapshot(session);
      } catch (error) {
        console.error("Error auto-creating route snapshot:", error);
      }
    } else {
      console.log("Skipping auto-snapshot:", {
        reason: !employee ? "No employee data" : session.status !== "completed" ? `Session status is ${session.status}` : "Unknown"
      });
    }
  };

  const autoCreateRouteSnapshot = async (session: TrackingSession) => {
    if (!employee) return;

    const calculateMapBounds = (): MapBounds => {
      const allPoints = [];

      if (session.route) {
        allPoints.push(...session.route);
      }

      meetings.forEach(meeting => {
        allPoints.push(meeting.location);
      });

      allPoints.push(employee.location);

      if (allPoints.length === 0) {
        return {
          north: employee.location.lat + 0.01,
          south: employee.location.lat - 0.01,
          east: employee.location.lng + 0.01,
          west: employee.location.lng - 0.01,
        };
      }

      const lats = allPoints.map(p => p.lat);
      const lngs = allPoints.map(p => p.lng);

      const margin = 0.005;

      return {
        north: Math.max(...lats) + margin,
        south: Math.min(...lats) - margin,
        east: Math.max(...lngs) + margin,
        west: Math.min(...lngs) - margin,
      };
    };

    const getMeetingSnapshots = (): MeetingSnapshot[] => {
      return meetings.map(meeting => ({
        id: meeting.id,
        location: meeting.location,
        clientName: meeting.clientName,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
      }));
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const autoTitle = `${employee.name} Route - ${dateStr} ${timeStr}`;

    const snapshotData: CreateRouteSnapshotRequest = {
      employeeId: employee.id,
      employeeName: employee.name,
      trackingSessionId: session.id,
      title: autoTitle,
      description: `Auto-captured route snapshot when tracking stopped. Duration: ${Math.round((session.duration || 0) / 60)} minutes.`,
      startLocation: session.startLocation,
      endLocation: session.endLocation,
      route: session.route || [employee.location],
      meetings: getMeetingSnapshots(),
      totalDistance: session.totalDistance || 0,
      duration: session.duration,
      status: session.status,
      mapBounds: calculateMapBounds(),
    };

    try {
      const response = await HttpClient.post("/api/route-snapshots", snapshotData);

      if (response.ok) {
        const snapshot = await response.json();
        console.log("Auto-created route snapshot:", snapshot);

        toast({
          title: "Route Auto-Captured",
          description: `${snapshot.title} saved successfully`,
        });
      } else {
        throw new Error("Failed to auto-create route snapshot");
      }
    } catch (error) {
      console.error("Error auto-creating route snapshot:", error);
      toast({
        title: "Auto-capture Failed",
        description: "Use 'Manual Capture' button to save route",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Employee["status"]) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "meeting":
        return "bg-warning text-warning-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: Employee["status"]) => {
    switch (status) {
      case "active":
        return "On Route";
      case "meeting":
        return "In Meeting";
      case "inactive":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Employee not found</p>
          <Button asChild>
            <Link to="/">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if current user is super admin or specific employee
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isSpecialEmployee = currentUser?._id === "67daa55d9c4abb36045d5bfe";
  const showBackButton = isSuperAdmin || isSpecialEmployee;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {employee.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time Tracking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSnapshotCaptureOpen(true)}
                className="text-primary"
              >
                <Camera className="h-4 w-4 mr-1" />
                Manual Capture
              </Button>
              <Badge
                variant="secondary"
                className={`${getStatusColor(employee.status)}`}
              >
                {getStatusText(employee.status)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-medium">{employee.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-medium">{employee.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="font-medium">{employee.phone}</span>
                  </div>
                  {employee.designation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Designation
                      </span>
                      <span className="font-medium">
                        {employee.designation}
                      </span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Department
                      </span>
                      <span className="font-medium">{employee.department}</span>
                    </div>
                  )}
                  {employee.companyName && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-muted-foreground">
                        Company
                      </span>
                      <span className="font-medium text-right max-w-xs">
                        {employee.companyName}
                      </span>
                    </div>
                  )}
                  {employee.reportTo && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Reports To
                      </span>
                      <span className="font-medium">{employee.reportTo}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(employee.status)}`}
                    >
                      {getStatusText(employee.status)}
                    </Badge>
                  </div>
                  {employee.currentTask && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-muted-foreground">
                        Current Task
                      </span>
                      <span className="font-medium text-right max-w-xs">
                        {employee.currentTask}
                      </span>
                    </div>
                  )}
                </div>

                {/* End Meeting Button - Shows when employee is in meeting */}
                {employee.status === "meeting" && (
                  <div className="pt-4 pb-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={handleEndMeetingAttempt}
                      disabled={isEndingMeeting !== null}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {isEndingMeeting
                        ? "Ending Meeting..."
                        : "End Current Meeting"}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCall(employee.phone)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEmail(employee.email, employee.name)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleSendMessage(employee.phone, employee.name)
                    }
                    className="col-span-2"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Location</span>
                  {employee.status === "meeting" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEndMeetingAttempt}
                      disabled={isEndingMeeting !== null}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {isEndingMeeting ? "Ending..." : "End Meeting"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openStartMeetingModal}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Start Meeting
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{employee.location.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.location.lat.toFixed(6)},{" "}
                      {employee.location.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Last updated {employee.lastUpdate}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    {showMap ? "Hide Map" : "View on Map"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      openInExternalMap(
                        employee.location.lat,
                        employee.location.lng,
                        employee.location.address,
                      )
                    }
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Open in Maps App
                  </Button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSnapshotCaptureOpen(true)}
                      className="text-primary"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Manual Capture
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSnapshotHistoryOpen(true)}
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </div>

                {showMap && employee && (
                  <div className="mt-4">
                    <EmployeeMap
                      employees={[employee]}
                      height="300px"
                      trackingSession={currentTrackingSession}
                      showRoute={currentTrackingSession !== null}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Meetings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Meetings</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{meetings.filter(m => !followUpMeetingIds.has(m.id)).length}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMeetingHistoryOpen(true)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meetings.filter(m => !followUpMeetingIds.has(m.id)).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No recent meetings
                  </p>
                ) : (
                  <div className="space-y-4">
                    {meetings.filter(m => !followUpMeetingIds.has(m.id)).map((meeting) => (
                      <div
                        key={meeting.id}
                        className={`border rounded-lg p-3 space-y-2 ${
                          meeting.status === "in-progress"
                            ? "border-warning bg-warning/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {meeting.clientName || "Unknown Client"}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="secondary"
                              className={
                                meeting.status === "completed"
                                  ? "bg-success text-success-foreground"
                                  : meeting.status === "in-progress"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-info text-info-foreground"
                              }
                            >
                              {meeting.status}
                            </Badge>
                            {meeting.status === "in-progress" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleEndMeetingClick(meeting.id)
                                }
                                disabled={isEndingMeeting === meeting.id}
                              >
                                {isEndingMeeting === meeting.id
                                  ? "Ending..."
                                  : "End Meeting"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {meeting.location.address}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span className="font-medium">Started:</span>
                            <span className="ml-1">
                              {new Date(meeting.startTime).toLocaleString()}
                            </span>
                          </p>
                          {meeting.endTime && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="font-medium">Ended:</span>
                              <span className="ml-1">
                                {new Date(meeting.endTime).toLocaleString()}
                              </span>
                            </p>
                          )}
                          {meeting.status === "in-progress" && (
                            <p className="text-sm text-success flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="font-medium">Duration:</span>
                              <span className="ml-1">
                                {Math.round(
                                  (Date.now() -
                                    new Date(meeting.startTime).getTime()) /
                                    (1000 * 60),
                                )}{" "}
                                minutes
                              </span>
                            </p>
                          )}
                          {meeting.endTime &&
                            meeting.status === "completed" && (
                              <p className="text-sm text-info flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="font-medium">Duration:</span>
                                <span className="ml-1">
                                  {Math.round(
                                    (new Date(meeting.endTime).getTime() -
                                      new Date(meeting.startTime).getTime()) /
                                      (1000 * 60),
                                  )}{" "}
                                  minutes
                                </span>
                              </p>
                            )}
                        </div>
                        {meeting.notes && (
                          <p className="text-sm">{meeting.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Location Tracker */}
            <LocationTracker
              employeeId={employee.id}
              employeeName={employee.name}
              onLocationUpdate={handleLocationUpdate}
              trackingEnabled={employee.status === "active"}
              onTrackingSessionStart={handleTrackingSessionStart}
              onTrackingSessionEnd={handleTrackingSessionEnd}
              todaysMeetings={todaysFollowUpMeetings}
            />

            {/* Today's Meetings Component */}
            <TodaysMeetings
              userId={employeeId}
              onStartMeeting={handleStartMeetingFromFollowUp}
              startedMeetingMap={startedMeetingMap}
              onEndMeetingFromFollowUp={handleEndMeetingFromFollowUp}
              onMeetingsFetched={handleTodaysMeetingsFetched}
              refreshTrigger={refreshTodaysMeetings}
              hasActiveMeeting={meetings.some(m => m.status === "in-progress" || m.status === "started")}
            />
          </div>
        </div>
      </div>

      {/* Start Meeting Modal */}
      {employee && (
        <StartMeetingModal
          isOpen={isStartMeetingModalOpen}
          onClose={() => setIsStartMeetingModalOpen(false)}
          onStartMeeting={startMeeting}
          employeeName={employee.name}
          location={employee.location.address}
          isLoading={isStartingMeeting}
        />
      )}

      {/* End Meeting Modal */}
      {employee && (
        <EndMeetingModal
          isOpen={isEndMeetingModalOpen}
          onClose={() => {
            setIsEndMeetingModalOpen(false);
            setActiveMeetingId(null);
            setStartedFollowUpData(null);
          }}
          onEndMeeting={handleEndMeetingWithDetails}
          employeeName={employee.name}
          isLoading={isEndingMeeting !== null}
          currentMeeting={activeMeetingId ? meetings.find(m => m.id === activeMeetingId) : null}
          followUpMeetingData={startedFollowUpData}
        />
      )}

      {/* Meeting History Modal */}
      <MeetingHistory
        employeeId={employeeId}
        isOpen={isMeetingHistoryOpen}
        onClose={() => setIsMeetingHistoryOpen(false)}
      />

      {/* Route Snapshot Capture Modal */}
      {employee && (
        <RouteSnapshotCapture
          employee={employee}
          trackingSession={currentTrackingSession}
          meetings={meetings}
          isOpen={isSnapshotCaptureOpen}
          onClose={() => setIsSnapshotCaptureOpen(false)}
          onSnapshotCreated={(snapshot) => {
            console.log("Snapshot created:", snapshot);
          }}
        />
      )}

      {/* Route Snapshot History Modal */}
      <RouteSnapshotHistory
        employeeId={employeeId}
        isOpen={isSnapshotHistoryOpen}
        onClose={() => setIsSnapshotHistoryOpen(false)}
      />
    </div>
  );
}