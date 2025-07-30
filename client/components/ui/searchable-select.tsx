import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchTerms?: string[]; // Additional search terms
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options?: SearchableSelectOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options = [],
  placeholder = "Select an option...",
  emptyMessage = "No options found.",
  disabled = false,
  className,
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [hasError, setHasError] = useState(false);

  // Reset error state when options change
  useEffect(() => {
    setHasError(false);
  }, [options]);

  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : [];

  const filteredOptions = useMemo(() => {
    if (!searchValue || safeOptions.length === 0) return safeOptions;

    const searchLower = searchValue.toLowerCase();
    return safeOptions.filter((option) => {
      if (!option || typeof option.value !== 'string' || typeof option.label !== 'string') {
        return false;
      }

      const labelMatch = option.label.toLowerCase().includes(searchLower);
      const valueMatch = option.value.toLowerCase().includes(searchLower);
      const searchTermsMatch = option.searchTerms?.some(term =>
        term && typeof term === 'string' && term.toLowerCase().includes(searchLower)
      );

      return labelMatch || valueMatch || searchTermsMatch;
    });
  }, [safeOptions, searchValue]);

  const selectedOption = safeOptions.find((option) => option?.value === value);

  // Don't render if there's no valid onValueChange function
  if (!onValueChange || typeof onValueChange !== 'function') {
    return null;
  }

  // Error fallback UI
  if (hasError) {
    return (
      <div className={cn("w-full p-2 border border-destructive rounded-md text-sm text-destructive", className)}>
        Error loading options. Please try again.
      </div>
    );
  }

  try {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={disabled}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false} value="" onValueChange={() => {}}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  option && option.value && option.label ? (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        try {
                          onValueChange(currentValue === value ? "" : currentValue);
                          setOpen(false);
                          setSearchValue("");
                        } catch (error) {
                          console.error("Error in SearchableSelect onSelect:", error);
                          setHasError(true);
                        }
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ) : null
                ))
              ) : (
                <CommandItem disabled>
                  {emptyMessage}
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
  } catch (error) {
    console.error("Error rendering SearchableSelect:", error);
    setHasError(true);
    return (
      <div className={cn("w-full p-2 border border-destructive rounded-md text-sm text-destructive", className)}>
        Error loading options. Please try again.
      </div>
    );
  }
}
