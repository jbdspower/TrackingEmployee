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
import { AlertCircle, Calendar } from "lucide-react";
import { FollowUpMeeting } from "@/components/TodaysMeetings";

interface PendingMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  pendingMeetings: FollowUpMeeting[];
}

export function PendingMeetingsModal({
  isOpen,
  onClose,
  onSubmit,
  pendingMeetings,
}: PendingMeetingsModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for pending meetings");
      return;
    }

    onSubmit(reason);
    setReason("");
    setError("");
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Pending Meetings Detected
          </DialogTitle>
          <DialogDescription>
            You have {pendingMeetings.length} pending meeting
            {pendingMeetings.length > 1 ? "s" : ""} scheduled for today. Please
            provide a reason before logging out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pending Meetings:</Label>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {pendingMeetings.map((meeting, index) => (
                <div
                  key={meeting._id}
                  className="flex items-start gap-2 text-sm"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{meeting.customerName || "Unnamed"}</span>
                    {meeting.companyName && (
                      <span className="text-muted-foreground">
                        {" "}
                        - {meeting.companyName}
                      </span>
                    )}
                    {meeting.meetingTime && (
                      <span className="text-muted-foreground ml-2">
                        ({meeting.meetingTime})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Pending Meetings <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="E.g., Client rescheduled, waiting for confirmation, technical issues..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              rows={4}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit & Logout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
