import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimpleSearchableSelectOption {
  value: string;
  label: string;
  searchTerms?: string[]; // Additional search terms
}

interface SimpleSearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options?: SimpleSearchableSelectOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export function SimpleSearchableSelect({
  value,
  onValueChange,
  options = [],
  placeholder = "Select an option...",
  emptyMessage = "No options found.",
  disabled = false,
  className,
  searchPlaceholder = "Search...",
}: SimpleSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");



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

  const handleSelect = (optionValue: string) => {
    try {
      const newValue = optionValue === value ? "" : optionValue;
      onValueChange(newValue);
      setOpen(false);
      setSearchValue("");
    } catch (error) {
      console.error("Error in SimpleSearchableSelect onSelect:", error);
    }
  };

  // Don't render if there's no valid onValueChange function
  if (!onValueChange || typeof onValueChange !== 'function') {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSearchValue("");
      }
    }}>
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
      <PopoverContent
        className="!w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0 !z-[1000]"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '300px', zIndex: 1000 }}
        side="bottom"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                option && option.value && option.label ? (
                  <div
                    key={`${option.value}-${index}`}
                    className={cn(
                      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      "cursor-pointer",
                      value === option.value && "bg-accent text-accent-foreground"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option.value);
                    }}
                    onMouseDown={(e) => {
                      // Prevent the click from being lost
                      e.preventDefault();
                    }}
                    role="option"
                    aria-selected={value === option.value}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                ) : null
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
