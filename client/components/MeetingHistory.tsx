import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HttpClient } from "@/lib/httpClient";
import { MeetingDetails } from "@shared/api";
import {
  Calendar,
  Clock,
  Search,
  User,
  Building,
  Phone,
  Mail,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Target,
} from "lucide-react";

interface MeetingHistoryEntry {
  id: string;
  sessionId: string;
  employeeId: string;
  meetingDetails: MeetingDetails;
  timestamp: string;
  leadId?: string;
  leadInfo?: {
    id: string;
    companyName: string;
    contactName: string;
  };
}

interface MeetingHistoryResponse {
  meetings: MeetingHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
}

interface MeetingHistoryProps {
  employeeId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingHistory({
  employeeId,
  isOpen,
  onClose,
}: MeetingHistoryProps) {
  const [meetings, setMeetings] = useState<MeetingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedMeeting, setSelectedMeeting] =
    useState<MeetingHistoryEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) {
      fetchMeetingHistory();
    }
  }, [isOpen, employeeId, currentPage]);

  const fetchMeetingHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (employeeId) {
        params.append("employeeId", employeeId);
      }

      console.log("Fetching meeting history for employee:", employeeId);
      const response = await HttpClient.get(
        `/api/meeting-history?${params.toString()}`,
      );

      if (response.ok) {
        const data: MeetingHistoryResponse = await response.json();
        console.log("Meeting history data received:", data);
        console.log("Number of meetings:", data.meetings?.length || 0);
        if (data.meetings?.length > 0) {
          console.log("First meeting details:", data.meetings[0]);
          console.log("First meeting's meetingDetails:", data.meetings[0].meetingDetails);
          console.log("Customer name:", data.meetings[0].meetingDetails?.customerName);
          console.log("Customer employee name:", data.meetings[0].meetingDetails?.customerEmployeeName);
        }
        setMeetings(data.meetings || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        // Don't try to read response body on error as it might cause "body stream already read" error
        console.error(
          "Failed to fetch meeting history:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching meeting history:", error);
      setMeetings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const details = meeting.meetingDetails;

    return (
      details.customerName?.toLowerCase().includes(searchLower) ||
      details.customerEmployeeName?.toLowerCase().includes(searchLower) ||
      details.customerEmail?.toLowerCase().includes(searchLower) ||
      details.customerDepartment?.toLowerCase().includes(searchLower) ||
      details.customerDesignation?.toLowerCase().includes(searchLower) ||
      details.discussion.toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (meeting: MeetingHistoryEntry) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Meeting History</span>
              {total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {total} meetings
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              View completed meetings with customer details and discussion
              notes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search and Filter */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings by customer, discussion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Meeting List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm
                    ? "No meetings found matching your search."
                    : "No meeting history available."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMeetings.map((meeting) => (
                    <Card
                      key={meeting.id}
                      className="border-l-4 border-l-primary"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {formatDate(meeting.timestamp)}
                                </span>
                              </div>
                              {meeting.leadInfo && (
                                <div className="flex items-center space-x-2">
                                  <Target className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm font-medium text-blue-600">
                                    Lead: {meeting.leadInfo.id}
                                  </span>
                                </div>
                              )}
                              {/* Display multiple customers */}
                              {meeting.meetingDetails.customers && meeting.meetingDetails.customers.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <Building className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      Customers ({meeting.meetingDetails.customers.length})
                                    </span>
                                  </div>
                                  {meeting.meetingDetails.customers.map((customer, index) => (
                                    <div key={index} className="ml-6 text-sm">
                                      <div className="font-medium">{customer.customerName}</div>
                                      <div className="text-muted-foreground">
                                        Contact: {customer.customerEmployeeName}
                                        {customer.customerDesignation && (
                                          <span> ({customer.customerDesignation})</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                /* Fallback to legacy fields for backward compatibility */
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <Building className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {meeting.meetingDetails.customerName || "Unknown Company"}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-6">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {meeting.meetingDetails.customerEmployeeName || "No contact person"}
                                      {meeting.meetingDetails.customerDesignation && (
                                        <span className="text-muted-foreground ml-1">
                                          ({meeting.meetingDetails.customerDesignation})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-start space-x-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {meeting.meetingDetails.discussion}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {/* Show contact badges from multiple customers */}
                              {meeting.meetingDetails.customers && meeting.meetingDetails.customers.length > 0 ? (
                                meeting.meetingDetails.customers.map((customer, index) => (
                                  <div key={index} className="flex flex-wrap gap-1">
                                    {customer.customerEmail && (
                                      <Badge variant="outline" className="text-xs">
                                        <Mail className="h-3 w-3 mr-1" />
                                        {customer.customerEmail}
                                      </Badge>
                                    )}
                                    {customer.customerMobile && (
                                      <Badge variant="outline" className="text-xs">
                                        <Phone className="h-3 w-3 mr-1" />
                                        {customer.customerMobile}
                                      </Badge>
                                    )}
                                    {customer.customerDepartment && (
                                      <Badge variant="secondary" className="text-xs">
                                        {customer.customerDepartment}
                                      </Badge>
                                    )}
                                  </div>
                                ))
                              ) : (
                                /* Fallback to legacy fields */
                                <>
                                  {meeting.meetingDetails.customerEmail && (
                                    <Badge variant="outline" className="text-xs">
                                      <Mail className="h-3 w-3 mr-1" />
                                      {meeting.meetingDetails.customerEmail}
                                    </Badge>
                                  )}
                                  {meeting.meetingDetails.customerMobile && (
                                    <Badge variant="outline" className="text-xs">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {meeting.meetingDetails.customerMobile}
                                    </Badge>
                                  )}
                                  {meeting.meetingDetails.customerDepartment && (
                                    <Badge variant="secondary" className="text-xs">
                                      {meeting.meetingDetails.customerDepartment}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(meeting)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, total)} of {total}{" "}
                  meetings
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Meeting Details</DialogTitle>
              <DialogDescription>
                {formatDate(selectedMeeting.timestamp)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Display multiple customers or fallback to legacy */}
              {selectedMeeting.meetingDetails.customers && selectedMeeting.meetingDetails.customers.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Customer Contacts ({selectedMeeting.meetingDetails.customers.length})
                  </label>
                  <div className="space-y-3 mt-2">
                    {selectedMeeting.meetingDetails.customers.map((customer, index) => (
                      <div key={index} className="p-3 bg-muted/20 rounded-md space-y-2">
                        <div>
                          <span className="text-sm font-medium">{customer.customerName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Contact:</span>
                            <p>{customer.customerEmployeeName}</p>
                          </div>
                          {customer.customerDesignation && (
                            <div>
                              <span className="text-muted-foreground">Position:</span>
                              <p>{customer.customerDesignation}</p>
                            </div>
                          )}
                          {customer.customerDepartment && (
                            <div>
                              <span className="text-muted-foreground">Department:</span>
                              <p>{customer.customerDepartment}</p>
                            </div>
                          )}
                          {customer.customerEmail && (
                            <div>
                              <span className="text-muted-foreground">Email:</span>
                              <p>{customer.customerEmail}</p>
                            </div>
                          )}
                          {customer.customerMobile && (
                            <div>
                              <span className="text-muted-foreground">Mobile:</span>
                              <p>{customer.customerMobile}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Fallback to legacy single customer display */
                <>
                  {selectedMeeting.meetingDetails.customerName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Customer Name
                      </label>
                      <p className="text-sm">
                        {selectedMeeting.meetingDetails.customerName}
                      </p>
                    </div>
                  )}

                  {selectedMeeting.meetingDetails.customerEmployeeName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Contact Person
                      </label>
                      <p className="text-sm">
                        {selectedMeeting.meetingDetails.customerEmployeeName}
                      </p>
                    </div>
                  )}

                  {selectedMeeting.meetingDetails.customerEmail && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <p className="text-sm">
                        {selectedMeeting.meetingDetails.customerEmail}
                      </p>
                    </div>
                  )}

                  {selectedMeeting.meetingDetails.customerMobile && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Mobile
                      </label>
                      <p className="text-sm">
                        {selectedMeeting.meetingDetails.customerMobile}
                      </p>
                    </div>
                  )}

                  {selectedMeeting.meetingDetails.customerDesignation && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Designation
                      </label>
                      <p className="text-sm">
                        {selectedMeeting.meetingDetails.customerDesignation}
                      </p>
                    </div>
                  )}

                  {selectedMeeting.meetingDetails.customerDepartment && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Department
                      </label>
                      <p className="text-sm">
                        {selectedMeeting.meetingDetails.customerDepartment}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Lead Information */}
              {selectedMeeting.leadInfo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Associated Lead
                  </label>
                  <div className="p-3 bg-blue-50 rounded-md mt-2 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">
                        Lead ID: {selectedMeeting.leadInfo.id}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600">
                      Company: {selectedMeeting.leadInfo.companyName}
                    </div>
                    <div className="text-sm text-blue-600">
                      Contact: {selectedMeeting.leadInfo.contactName}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Discussion
                </label>
                <p className="text-sm bg-muted/50 p-3 rounded-md mt-1">
                  {selectedMeeting.meetingDetails.discussion}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
