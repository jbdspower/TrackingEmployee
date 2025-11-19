import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Building2 } from "lucide-react";
import { FollowUpMeeting } from "@/components/TodaysMeetings";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (meetingsWithReasons: Array<{ meeting: FollowUpMeeting; reason: string }>) => void;
  pendingMeetings: FollowUpMeeting[];
}

export function PendingMeetingsModal({
  isOpen,
  onClose,
  onSubmit,
  pendingMeetings,
}: PendingMeetingsModalProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReasonChange = (meetingId: string, value: string) => {
    setReasons(prev => ({ ...prev, [meetingId]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[meetingId];
      return newErrors;
    });
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate that all meetings have reasons
    pendingMeetings.forEach(meeting => {
      if (!reasons[meeting._id]?.trim()) {
        newErrors[meeting._id] = "Reason required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create array of meetings with their reasons
    const meetingsWithReasons = pendingMeetings.map(meeting => ({
      meeting,
      reason: reasons[meeting._id].trim()
    }));

    onSubmit(meetingsWithReasons);
    setReasons({});
    setErrors({});
  };

  const handleClose = () => {
    setReasons({});
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Incomplete Today's Meetings
          </DialogTitle>
          <DialogDescription>
            You have {pendingMeetings.length} incomplete meeting
            {pendingMeetings.length > 1 ? "s" : ""} scheduled for today. Please provide a reason for each meeting before logging out. These meetings will be marked as "Incomplete".
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {pendingMeetings.map((meeting, index) => (
              <div
                key={meeting._id}
                className="space-y-3 p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">
                      {meeting.companyName || "Unnamed Company"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {meeting.customerName}
                      {meeting.meetingTime && ` • ${meeting.meetingTime}`}
                    </p>
                    {meeting.remark && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        Note: {meeting.remark}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`reason-${meeting._id}`} className="text-sm">
                    Reason for not completing <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={`reason-${meeting._id}`}
                    placeholder="E.g., Client rescheduled, not available, technical issues..."
                    value={reasons[meeting._id] || ""}
                    onChange={(e) => handleReasonChange(meeting._id, e.target.value)}
                    rows={3}
                    className={errors[meeting._id] ? "border-destructive" : ""}
                  />
                  {errors[meeting._id] && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors[meeting._id]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Submit All & Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
