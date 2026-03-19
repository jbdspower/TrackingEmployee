import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer } from "@shared/api";
import { Loader2, Plus, AlertCircle } from "lucide-react";

interface CompanySelectorProps {
  onCompanySelect: (customer: Customer) => void;
  selectedCustomerId?: string;
  disabled?: boolean;
  onAddNewCompany?: () => void;
}

export interface CompanySelectorRef {
  refreshCompanies: () => Promise<void>;
  resetSelection: () => void;
}

export const CompanySelector = forwardRef<
  CompanySelectorRef,
  CompanySelectorProps
>(
  (
    {
      onCompanySelect,
      selectedCustomerId,
      disabled = false,
      onAddNewCompany,
    },
    ref,
  ) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch customers: try same-origin proxy first, fall back to external API if proxy returns HTML (e.g. wrong host)
    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);
      const EXTERNAL_CUSTOMER_URL = "https://jbdspower.in/LeafNetServer/api/customer";
      // API can return large payload (~1.3MB+); allow time to download on slow networks
      const timeoutMs = 120000; // 2 minutes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const tryParseJson = async (res: Response): Promise<unknown> => {
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      };

      try {
        const proxyUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/crm/customers`
            : "/api/crm/customers";
        console.log("Fetching companies (proxy first)...");
        let response = await fetch(proxyUrl, { signal: controller.signal });
        let data: unknown = null;
        if (response.ok) data = await tryParseJson(response);
        if (!response.ok || data === null) {
          clearTimeout(timeoutId);
          const extController = new AbortController();
          const extTimeout = setTimeout(() => extController.abort(), timeoutMs);
          console.log("Proxy unavailable or returned non-JSON, trying external API...");
          response = await fetch(EXTERNAL_CUSTOMER_URL, {
            signal: extController.signal,
          });
          clearTimeout(extTimeout);
          if (!response.ok)
            throw new Error(`Failed to fetch customers: ${response.statusText}`);
          data = await tryParseJson(response);
          if (data === null) throw new Error("Invalid response from server");
        }
        clearTimeout(timeoutId);

        const customerArray = Array.isArray(data) ? data : [];
        console.log(`Fetched ${customerArray.length} companies`);
        setCustomers(customerArray);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Error fetching customers:", err);
        const message =
          err instanceof Error ? err.message : "Failed to fetch customers";
        setError(
          (err as { name?: string })?.name === "AbortError"
            ? "Request timed out. Please try again."
            : message,
        );
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchCustomers();
    }, []);

    // Reset selection state
    const resetSelection = () => {
      console.log("Resetting company selection");
      // No need to clear anything specific here since we're not storing temp data
    };

    // Expose functions via ref
    useImperativeHandle(ref, () => ({
      refreshCompanies: fetchCustomers,
      resetSelection,
    }));

    const handleCompanySelect = (customerId: string) => {
      const customer = customers.find((c) => c._id === customerId);
      if (customer) {
        console.log("Selected company:", customer.CustomerCompanyName);
        onCompanySelect(customer);
      }
    };

    if (error) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-destructive">
              Company Selection
            </Label>
            {onAddNewCompany && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddNewCompany}
                disabled={disabled}
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add New</span>
              </Button>
            )}
          </div>
          <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium">Failed to load companies</p>
            </div>
            <p className="text-xs mt-1">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="company" className="text-sm">
            Select Company
            <span className="text-destructive ml-1">*</span>
          </Label>
          {onAddNewCompany && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddNewCompany}
              disabled={disabled || loading}
              className="flex items-center space-x-1"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add New</span>
            </Button>
          )}
        </div>

        <Select
          onValueChange={handleCompanySelect}
          value={selectedCustomerId || ""}
          disabled={disabled || loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading companies...</span>
                  </div>
                ) : (
                  "Select a company"
                )
              }
            />
          </SelectTrigger>
          <SelectContent>
            {customers.length === 0 ? (
              <SelectItem value="no-companies" disabled>
                No companies found
              </SelectItem>
            ) : (
              customers.map((customer) => (
                <SelectItem key={customer._id} value={customer._id}>
                  {customer.CustomerCompanyName}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

CompanySelector.displayName = "CompanySelector";
