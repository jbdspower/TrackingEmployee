import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Phone,
  Mail,
  Calendar,
  PlayCircle,
  Loader2,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { isToday, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export interface FollowUpMeeting {
  _id: string;
  status: "Pending" | "Approved" | "Rejected";
  meetingStatus:
    | "Not Started"
    | "In Progress"
    | "Completed"
    | "complete"
    | "COMPLETED"
    | "Pending"
    | "Incomplete"
    | "IN_PROGRESS"
    | "Started"
    | "meeting on-going";
  date: string;
  followupDate: string | null;
  leadId: string;
  customerName: string;
  companyName: string;
  type: "Call" | "Email" | "Meeting" | "Other";
  remark: string;
  time: string;
  meetingTime: string;
  userId: string;
  customerEmail: string;
  customerMobile: string;
  customerDesignation: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  teamMember: string[];
}

interface TodaysMeetingsProps {
  userId: string;
  onStartMeeting: (meeting: FollowUpMeeting) => void;
  startedMeetingMap?: Record<string, string>;
  onEndMeetingFromFollowUp?: (followUpId: string, meetingId: string) => void | Promise<void>;
  onMeetingsFetched?: (meetings: FollowUpMeeting[]) => void;
  refreshTrigger?: number;
  hasActiveMeeting?: boolean; // indicates if there's an active meeting anywhere
}

export function TodaysMeetings({
  userId,
  onStartMeeting,
  startedMeetingMap,
  onEndMeetingFromFollowUp,
  onMeetingsFetched,
  refreshTrigger,
  hasActiveMeeting = false,
}: TodaysMeetingsProps) {
  const [meetings, setMeetings] = useState<FollowUpMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Local state to keep currently active follow-up ID (for today's list)
  const [localActiveFollowUpId, setLocalActiveFollowUpId] = useState<string | null>(null);

  const { toast } = useToast();

  // Keep localActiveFollowUpId in sync with startedMeetingMap / hasActiveMeeting
  useEffect(() => {
    if (startedMeetingMap && Object.keys(startedMeetingMap).length > 0) {
      const [firstActiveId] = Object.keys(startedMeetingMap);
      setLocalActiveFollowUpId(firstActiveId || null);
    } else if (!hasActiveMeeting) {
      // If parent says there is no active meeting anywhere, clear local state
      setLocalActiveFollowUpId(null);
    }
  }, [startedMeetingMap, hasActiveMeeting]);

  useEffect(() => {
    fetchTodaysMeetings();
    const interval = setInterval(fetchTodaysMeetings, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Refresh when refreshTrigger changes (after meeting ends)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log("🔄 Refresh trigger changed, fetching meetings and clearing local state");
      fetchTodaysMeetings();
      // Clear local active state when meetings are refreshed (after successful end)
      setLocalActiveFollowUpId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const fetchTodaysMeetings = async () => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log("Fetching meetings for user:", userId);

      const externalApiUrl =
        import.meta.env.VITE_EXTERNAL_LEAD_API ||
        "https://jbdspower.in/LeafNetServer/api";
      const baseUrl = externalApiUrl.replace("/getAllLead", "");
      const url = `${baseUrl}/getFollowUpHistory?userId=${userId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch meetings: ${response.status}`);
      }

      const data: FollowUpMeeting[] = await response.json();
      console.log("All meetings fetched:", data.length);

      // Filter only approved meetings that are for today
      const approvedTodaysMeetings = data.filter((meeting) => {
        const meetingDate = meeting.followupDate || meeting.date;
        if (!meetingDate) return false;

        try {
          const date = parseISO(meetingDate);
          return isToday(date) && meeting.status === "Approved";
        } catch (error) {
          console.warn("Invalid date format for meeting:", meeting._id);
          return false;
        }
      });

      console.log("Today's approved meetings:", approvedTodaysMeetings.length);
      
      // 🔹 Log all meeting statuses for debugging
      approvedTodaysMeetings.forEach(m => {
        console.log(`📋 Meeting ${m.companyName}: status="${m.meetingStatus}"`);
      });
      
      // 🔹 Check if any of these meetings are currently active (In Progress)
      const activeMeetingsFromAPI = approvedTodaysMeetings.filter(m => 
        isMeetingActiveFromStatus(m)
      );
      
      if (activeMeetingsFromAPI.length > 0) {
        console.log("🔄 Found active meetings from API after refresh:", activeMeetingsFromAPI.map(m => ({
          id: m._id,
          company: m.companyName,
          status: m.meetingStatus
        })));
        // Set the first active meeting as the local active one
        setLocalActiveFollowUpId(activeMeetingsFromAPI[0]._id);
      } else {
        console.log("⚠️ No active meetings found in API. Checking startedMeetingMap...");
      }
      
      setMeetings(approvedTodaysMeetings);

      if (onMeetingsFetched) {
        onMeetingsFetched(approvedTodaysMeetings);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch meetings"
      );
    } finally {
      setLoading(false);
    }
  };

  console.log("Todays meeting");
  

  // Helper: completed?
  const isMeetingComplete = (meeting: FollowUpMeeting): boolean => {
    return (
      meeting.meetingStatus === "complete" ||
      meeting.meetingStatus === "Completed" ||
      meeting.meetingStatus === "COMPLETED"
    );
  };

  // Helper: active / in progress from backend
  const isMeetingActiveFromStatus = (meeting: FollowUpMeeting): boolean => {
    return (
      meeting.meetingStatus === "In Progress" ||
      meeting.meetingStatus === "IN_PROGRESS" ||
      meeting.meetingStatus === "Started" ||
      meeting.meetingStatus === "meeting on-going" // 🔹 CRITICAL: This is the status set when meeting starts
    );
  };

  // Is there ANY active meeting (local or global)?
  const anyActiveMeeting =
    hasActiveMeeting ||
    !!localActiveFollowUpId ||
    (startedMeetingMap && Object.keys(startedMeetingMap).length > 0) ||
    meetings.some((m) => isMeetingActiveFromStatus(m));

  const handleStartMeetingClick = (meeting: FollowUpMeeting) => {
    console.log(
      "🎯 Today's Meeting: Attempting to start meeting:",
      meeting.companyName
    );
    console.log("🔒 Has active meeting?", hasActiveMeeting);
    console.log("🧷 Local active followUpId:", localActiveFollowUpId);

    if (anyActiveMeeting) {
      console.log("❌ BLOCKED: Cannot start - active meeting exists");
      toast({
        title: "Cannot Start Meeting",
        description:
          "You already have an active meeting. Please complete it before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ No active meeting, starting and marking as local active...");
    // Optimistically mark this follow-up as active locally
    setLocalActiveFollowUpId(meeting._id);
    onStartMeeting(meeting);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-success text-success-foreground";
      case "Pending":
        return "bg-warning text-warning-foreground";
      case "Rejected":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <Phone className="h-4 w-4" />;
      case "Email":
        return <Mail className="h-4 w-4" />;
      case "Meeting":
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Approved Meetings</span>
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Loading...
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">
              Fetching today's approved meetings...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Approved Meetings</span>
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTodaysMeetings}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Today's Approved Meetings</span>
          <Badge variant="secondary">
            {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {meetings.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No approved meetings for today</h4>
            <p className="text-sm text-muted-foreground">
              Only approved meetings are shown here.
            </p>
          </div>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {meetings.map((meeting) => {
              // Check if this meeting is active
              const hasValidMeetingId = startedMeetingMap && !!startedMeetingMap[meeting._id];
              const isLocallyActive = localActiveFollowUpId === meeting._id;
              const isActiveInAPI = isMeetingActiveFromStatus(meeting);
              
              // 🔹 CRITICAL FIX: Show "End Meeting" button if API says meeting is active
              // This ensures button shows even after page refresh or if startedMeetingMap is lost
              const isActiveForThisRow = isActiveInAPI || isLocallyActive;
              
              // Mark as orphaned only if there's a conflict:
              // API says active BUT there's ANOTHER active meeting somewhere else
              const isOrphanedMeeting = false; // 🔹 Disabled orphan detection - let parent handle finding meeting
              
              if (isOrphanedMeeting) {
                console.warn("⚠️ Orphaned meeting detected:", {
                  id: meeting._id,
                  company: meeting.companyName,
                  status: meeting.meetingStatus,
                  hasValidMeetingId,
                  isLocallyActive,
                  hasActiveMeeting
                });
              }

              return (
                <div
                  key={meeting._id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          {getMeetingTypeIcon(meeting.type)}
                          <span className="font-medium">{meeting.type}</span>
                        </div>
                        <Badge
                          className={getStatusColor(meeting.status)}
                          variant="secondary"
                        >
                          {meeting.status}
                        </Badge>
                        {meeting.meetingTime && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {meeting.meetingTime}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        {meeting.companyName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-3 w-3" />
                            <span className="font-medium">
                              {meeting.companyName}
                            </span>
                          </div>
                        )}

                        {meeting.customerName && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {meeting.customerName}
                            </span>
                            {meeting.customerDesignation && (
                              <span className="text-muted-foreground">
                                • {meeting.customerDesignation}
                              </span>
                            )}
                          </div>
                        )}

                        {meeting.customerMobile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {meeting.customerMobile}
                          </div>
                        )}

                        {meeting.customerEmail && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {meeting.customerEmail}
                          </div>
                        )}

                        {meeting.remark && (
                          <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                            <span className="font-medium">Note: </span>
                            {meeting.remark}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ✅ Button logic with Incomplete status */}
                    {meeting.meetingStatus === "Incomplete" || isOrphanedMeeting ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="flex-shrink-0 border-orange-500 text-orange-600"
                        title={isOrphanedMeeting ? "Meeting was started but local data was lost. Please contact support." : "Meeting marked as incomplete"}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Incomplete
                      </Button>
                    ) : isMeetingComplete(meeting) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="flex-shrink-0"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    ) : isActiveForThisRow ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          console.log("🔴 End Meeting clicked for:", meeting._id);
                          console.log("🗺️ startedMeetingMap:", startedMeetingMap);
                          
                          // Get the meeting ID from the map
                          const meetingId = startedMeetingMap?.[meeting._id];
                          
                          if (onEndMeetingFromFollowUp && meetingId) {
                            console.log("✅ Calling onEndMeetingFromFollowUp with:", meeting._id, meetingId);
                            onEndMeetingFromFollowUp(meeting._id, meetingId);
                          } else {
                            console.warn("⚠️ Cannot end meeting - missing handler or meetingId:", {
                              hasHandler: !!onEndMeetingFromFollowUp,
                              meetingId,
                              followUpId: meeting._id
                            });
                            
                            // If we don't have the meetingId in the map, we still need to open the modal
                            // The parent should handle finding the active meeting
                            if (onEndMeetingFromFollowUp) {
                              // Pass empty string as meetingId - parent will need to find it
                              onEndMeetingFromFollowUp(meeting._id, "");
                            }
                          }
                          
                          // DON'T clear local state here - it will be cleared after meeting ends successfully
                          // setLocalActiveFollowUpId(null);
                        }}
                        className="flex-shrink-0"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        End Meeting
                      </Button>
                    ) : anyActiveMeeting ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="flex-shrink-0 opacity-50 cursor-not-allowed"
                        title="Complete your current meeting first"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Meeting Active
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleStartMeetingClick(meeting)}
                        className="flex-shrink-0"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Meeting
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function getPendingTodaysMeetings(
  meetings: FollowUpMeeting[]
): FollowUpMeeting[] {
  return meetings.filter((meeting) => {
    const meetingDate = meeting.followupDate || meeting.date;
    if (!meetingDate) return false;

    try {
      const date = parseISO(meetingDate);
      return isToday(date) && meeting.status === "Pending";
    } catch (error) {
      return false;
    }
  });
}
