import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
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
import { HttpClient } from "@/lib/httpClient";
import { format, isToday, parseISO } from "date-fns";

export interface FollowUpMeeting {
  _id: string;
  status: "Pending" | "Approved" | "Rejected";
  meetingStatus: "Not Started" | "In Progress" | "Completed" | "complete" | "Pending";
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
  onEndMeetingFromFollowUp?: (followUpId: string, meetingId: string) => void;
  onMeetingsFetched?: (meetings: FollowUpMeeting[]) => void;
  refreshTrigger?: number;
}

export function TodaysMeetings({
  userId,
  onStartMeeting,
  startedMeetingMap,
  onEndMeetingFromFollowUp,
  onMeetingsFetched,
  refreshTrigger,
}: TodaysMeetingsProps) {
  const [meetings, setMeetings] = useState<FollowUpMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endingMeetingId, setEndingMeetingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysMeetings();
    const interval = setInterval(fetchTodaysMeetings, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchTodaysMeetings();
    }
  }, [refreshTrigger]);

  const fetchTodaysMeetings = async () => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      return
    }

    try {
      setError(null);
      console.log("Fetching meetings for user:", userId);

      const externalApiUrl = import.meta.env.VITE_EXTERNAL_LEAD_API || "https://jbdspower.in/LeafNetServer/api";
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
      setMeetings(approvedTodaysMeetings);

      if (onMeetingsFetched) {
        onMeetingsFetched(approvedTodaysMeetings);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
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

  // Helper function to check if meeting is complete
  const isMeetingComplete = (meeting: FollowUpMeeting): boolean => {
    return meeting.meetingStatus === "complete" || 
           meeting.meetingStatus === "Completed" ||
           meeting.meetingStatus === "COMPLETED";
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
            <p className="text-sm text-muted-foreground mt-2">Fetching today's approved meetings...</p>
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
            <p className="text-sm text-muted-foreground">Only approved meetings are shown here.</p>
          </div>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {meetings.map((meeting) => (
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
                      <Badge className={getStatusColor(meeting.status)} variant="secondary">
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
                          <span className="font-medium">{meeting.companyName}</span>
                        </div>
                      )}

                      {meeting.customerName && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{meeting.customerName}</span>
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

                  {/* Updated button logic */}
                  {isMeetingComplete(meeting) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="flex-shrink-0"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  ) : startedMeetingMap && startedMeetingMap[meeting._id] ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        onEndMeetingFromFollowUp &&
                        onEndMeetingFromFollowUp(meeting._id, startedMeetingMap[meeting._id])
                      }
                      className="flex-shrink-0"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      End Meeting
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onStartMeeting(meeting)}
                      className="flex-shrink-0"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Start Meeting
                    </Button>
                  )}
                </div>
              </div>
            ))}
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