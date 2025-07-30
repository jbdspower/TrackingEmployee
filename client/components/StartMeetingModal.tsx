import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MapPin, User, Loader2, AlertCircle, FileText } from "lucide-react";
import { Customer, Lead } from "@shared/api";
import { BasicSelect, BasicSelectOption } from "@/components/ui/basic-select";
import { HttpClient } from "@/lib/httpClient";

interface StartMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMeeting: (meetingData: {
    clientName: string;
    reason: string;
    notes: string;
    leadId?: string;
    leadInfo?: {
      id: string;
      companyName: string;
      contactName: string;
    };
  }) => void;
  employeeName: string;
  location: string;
  isLoading?: boolean;
}



// Meeting reasons/types
const MEETING_REASONS = [
  "Initial Client Meeting",
  "Project Discussion",
  "Equipment Installation",
  "System Maintenance",
  "Technical Support",
  "Training Session",
  "Progress Review",
  "Problem Resolution",
  "Contract Negotiation",
  "Follow-up Meeting",
  "Emergency Response",
  "Consultation",
  "Demo/Presentation",
  "Site Survey",
  "Other",
];

export function StartMeetingModal({
  isOpen,
  onClose,
  onStartMeeting,
  employeeName,
  location,
  isLoading = false,
}: StartMeetingModalProps) {
  const [clientName, setClientName] = useState("");
  const [customClient, setCustomClient] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  // Fetch customers from external API
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    setCustomerError(null);
    try {
      console.log("Fetching companies from external API for start meeting...");
      const response = await HttpClient.request(
        "https://jbdspower.in/LeafNetServer/api/customer",
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Customer API raw response:", data);

      // The API returns an array directly
      const customerArray = Array.isArray(data) ? data : [];
      console.log(`Fetched ${customerArray.length} companies for start meeting`, customerArray.slice(0, 3));
      setCustomers(customerArray);
    } catch (err) {
      console.error("Error fetching customers for start meeting:", err);
      setCustomerError(
        err instanceof Error ? err.message : "Failed to fetch customers",
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch leads from external API
  const fetchLeads = async () => {
    setLoadingLeads(true);
    setLeadError(null);
    try {
      console.log("Fetching leads from external API for start meeting...");
      const response = await HttpClient.request(
        "https://jbdspower.in/LeafNetServer/api/getAllLead",
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Leads API raw response:", data);

      // The API returns an array directly
      const leadArray = Array.isArray(data) ? data : [];
      console.log(`Fetched ${leadArray.length} leads for start meeting`, leadArray.slice(0, 3));
      setLeads(leadArray);
    } catch (err) {
      console.error("Error fetching leads for start meeting:", err);
      setLeadError(
        err instanceof Error ? err.message : "Failed to fetch leads",
      );
    } finally {
      setLoadingLeads(false);
    }
  };

  // Filter leads based on selected company
  const filterLeadsByCompany = (selectedCompany: string) => {
    if (!selectedCompany || selectedCompany === "custom" || !Array.isArray(leads)) {
      setFilteredLeads([]);
      return;
    }

    console.log("Filtering leads for company:", selectedCompany);

    const filtered = leads.filter(lead => {
      if (!lead || !lead.CompanyName) return false;

      // Case-insensitive exact match only
      const companyMatch = lead.CompanyName.toLowerCase().trim() === selectedCompany.toLowerCase().trim();

      console.log(`Comparing "${lead.CompanyName}" with "${selectedCompany}": ${companyMatch}`);
      return companyMatch;
    });

    console.log(`Filtered ${filtered.length} leads for company "${selectedCompany}":`, filtered);
    setFilteredLeads(filtered);
  };

  // Handle company selection change
  const handleCompanyChange = (value: string) => {
    console.log("Client selection changed:", value);
    setClientName(value);
    setSelectedLead(""); // Clear lead selection when company changes
    filterLeadsByCompany(value);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchLeads();
    }
  }, [isOpen]);

  // Filter leads when leads data or client selection changes
  useEffect(() => {
    if (leads.length > 0 && clientName && clientName !== "custom") {
      filterLeadsByCompany(clientName);
    } else {
      setFilteredLeads([]);
    }
  }, [leads, clientName]);

  const handleSubmit = () => {
    // Validate form
    const newErrors: { [key: string]: string } = {};

    const finalClientName = clientName === "custom" ? customClient : clientName;

    if (!finalClientName.trim()) {
      newErrors.client = "Client name is required";
    }

    if (!reason) {
      newErrors.reason = "Meeting reason is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Get selected lead info with proper error handling
    const selectedLeadInfo = selectedLead && Array.isArray(leads)
      ? leads.find(lead => lead && lead.Id === selectedLead)
      : null;

    console.log("Starting meeting with data:", {
      clientName: finalClientName,
      reason,
      notes: notes.trim(),
      leadId: selectedLead || undefined,
      leadInfo: selectedLeadInfo
    });

    // Clear errors and submit
    setErrors({});
    onStartMeeting({
      clientName: finalClientName,
      reason,
      notes: notes.trim(),
      leadId: selectedLead || undefined,
      leadInfo: selectedLeadInfo ? {
        id: selectedLeadInfo.Id,
        companyName: selectedLeadInfo.CompanyName,
        contactName: selectedLeadInfo.Name,
      } : undefined,
    });
  };

  const handleClose = () => {
    // Reset form
    setClientName("");
    setCustomClient("");
    setReason("");
    setNotes("");
    setErrors({});
    setCustomerError(null);
    setLeadError(null);
    setSelectedLead("");
    setFilteredLeads([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Start Meeting</span>
          </DialogTitle>
          <DialogDescription>
            Create a new meeting record for {employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Location */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <MapPin className="h-4 w-4" />
            <span>Location: {location}</span>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Client / Company</Label>
            {customerError ? (
              <div className="space-y-2">
                <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <p className="font-medium">Failed to load companies</p>
                  </div>
                  <p className="text-xs mt-1">{customerError}</p>
                  <button
                    type="button"
                    onClick={fetchCustomers}
                    className="mt-2 px-3 py-1 bg-destructive/10 hover:bg-destructive/20 rounded text-xs"
                  >
                    Retry
                  </button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customClientFallback">Enter Client Name Manually</Label>
                  <Input
                    id="customClientFallback"
                    value={customClient}
                    onChange={(e) => {
                      setCustomClient(e.target.value);
                      setClientName("custom");
                    }}
                    placeholder="Enter client name"
                    className={errors.client ? "border-destructive" : ""}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <BasicSelect
                  value={clientName}
                  onValueChange={handleCompanyChange}
                  options={[
                    // Regular customers (deduplicated with better validation)
                    ...(Array.isArray(customers)
                      ? Array.from(
                          new Map(
                            customers
                              .filter(customer => {
                                const isValid = customer &&
                                  customer.CustomerCompanyName &&
                                  typeof customer.CustomerCompanyName === 'string' &&
                                  customer.CustomerCompanyName.trim().length > 0;
                                if (!isValid && customer) {
                                  console.warn("Invalid customer data:", customer);
                                }
                                return isValid;
                              })
                              .map(customer => [customer.CustomerCompanyName.trim(), customer])
                          ).values()
                        ).map((customer): BasicSelectOption => ({
                          value: customer.CustomerCompanyName.trim(),
                          label: customer.CustomerCompanyName.trim(),
                          searchTerms: [customer.CustomerCompanyName.trim()],
                        }))
                      : []
                    ),
                    // Custom option
                    {
                      value: "custom",
                      label: "Custom Client...",
                      searchTerms: ["custom", "manual", "other"],
                    }
                  ]}
                  placeholder={
                    loadingCustomers ? "Loading companies..." : "Select a company or choose custom"
                  }
                  emptyMessage="No companies found. Choose custom to enter manually."
                  disabled={loadingCustomers}
                  searchPlaceholder="Search companies..."
                  className={errors.client ? "border-destructive" : ""}
                />
                {/* Fallback manual input if dropdown fails */}
                <div className="text-xs text-muted-foreground">
                  Can't find your company? Use "Custom Client..." option above
                </div>
              </div>
            )}
            {errors.client && (
              <p className="text-sm text-destructive">{errors.client}</p>
            )}
          </div>

          {/* Custom Client Input */}
          {clientName === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customClient">Custom Client Name</Label>
              <Input
                id="customClient"
                value={customClient}
                onChange={(e) => setCustomClient(e.target.value)}
                placeholder="Enter client name"
                className={errors.client ? "border-destructive" : ""}
              />
            </div>
          )}

          {/* Lead Selection */}
          <div className="space-y-2">
            <Label htmlFor="lead">
              Lead Association (Optional)
              {clientName && clientName !== "custom" && filteredLeads.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({filteredLeads.length} leads for {clientName})
                </span>
              )}
            </Label>
            {leadError ? (
              <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <p className="font-medium">Failed to load leads</p>
                </div>
                <p className="text-xs mt-1">{leadError}</p>
                <button
                  type="button"
                  onClick={fetchLeads}
                  className="mt-2 px-3 py-1 bg-destructive/10 hover:bg-destructive/20 rounded text-xs"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Show message when company is selected but no leads found */}
                {clientName && clientName !== "custom" && leads.length > 0 && filteredLeads.length === 0 && (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                    No leads found for "{clientName}". You can still proceed without associating a lead.
                  </div>
                )}

                {/* Use filtered leads when company is selected, otherwise show all leads */}
                {((clientName && clientName !== "custom") ? filteredLeads.length > 0 : leads.length > 0) ? (
                  <BasicSelect
                    value={selectedLead}
                    onValueChange={(value) => {
                      console.log("Lead selection changed:", value);
                      setSelectedLead(value);
                    }}
                    options={
                      Array.isArray(clientName && clientName !== "custom" ? filteredLeads : leads)
                        ? Array.from(
                            new Map(
                              (clientName && clientName !== "custom" ? filteredLeads : leads)
                                .filter(lead => {
                                  const isValid = lead &&
                                    lead.Id &&
                                    lead.CompanyName &&
                                    lead.Name &&
                                    typeof lead.Id === 'string' &&
                                    typeof lead.CompanyName === 'string' &&
                                    typeof lead.Name === 'string' &&
                                    lead.Id.trim().length > 0 &&
                                    lead.CompanyName.trim().length > 0 &&
                                    lead.Name.trim().length > 0;
                                  if (!isValid && lead) {
                                    console.warn("Invalid lead data:", lead);
                                  }
                                  return isValid;
                                })
                                .map(lead => [lead.Id.trim(), lead])
                            ).values()
                          ).map((lead): BasicSelectOption => ({
                            value: lead.Id.trim(),
                            label: `${lead.Id.trim()} - ${lead.CompanyName.trim()} (${lead.Name.trim()})`,
                            searchTerms: [
                              lead.CompanyName.trim(),
                              lead.Name.trim(),
                              lead.Email || "",
                              lead.Subject || "",
                              lead.Stage || "",
                              lead.Id.trim()
                            ].filter(term => term && typeof term === 'string' && term.length > 0),
                          }))
                        : []
                    }
                    placeholder={
                      loadingLeads
                        ? "Loading leads..."
                        : clientName && clientName !== "custom"
                          ? `Select a lead for ${clientName} (optional)`
                          : "Select a company first to see related leads"
                    }
                    emptyMessage={
                      clientName && clientName !== "custom"
                        ? `No leads found for ${clientName}`
                        : "No leads available"
                    }
                    disabled={loadingLeads}
                    searchPlaceholder="Search leads by ID, company, name..."
                  />
                ) : (
                  <Select value={selectedLead} onValueChange={setSelectedLead} disabled={loadingLeads}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingLeads
                          ? "Loading leads..."
                          : clientName && clientName !== "custom"
                            ? `Select a lead for ${clientName} (optional)`
                            : "Select a company first to see related leads"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-leads" disabled>
                        {loadingLeads ? "Loading..." : "No leads available"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            {selectedLead && (
              <div className="text-xs text-muted-foreground">
                <FileText className="h-3 w-3 inline mr-1" />
                Lead selected: {(clientName && clientName !== "custom" ? filteredLeads : leads).find(l => l.Id === selectedLead)?.Subject}
              </div>
            )}
          </div>

          {/* Meeting Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Meeting Reason / Type</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger
                className={errors.reason ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select meeting reason" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this meeting..."
              rows={3}
            />
          </div>

          {/* Meeting Info */}
          <div className="bg-primary/5 p-3 rounded-md text-sm">
            <div className="flex items-center space-x-2 mb-1">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium">Employee: {employeeName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Start Time: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Starting..." : "Start Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
