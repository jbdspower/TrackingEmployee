import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BasicSelectOption {
  value: string;
  label: string;
  searchTerms?: string[];
}

interface BasicSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options?: BasicSelectOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export function BasicSelect({
  value,
  onValueChange,
  options = [],
  placeholder = "Select an option...",
  emptyMessage = "No options found.",
  disabled = false,
  className,
  searchPlaceholder = "Search...",
}: BasicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const safeOptions = Array.isArray(options) ? options : [];
  
  const filteredOptions = searchValue
    ? safeOptions.filter((option) => {
        if (!option || typeof option.value !== 'string' || typeof option.label !== 'string') {
          return false;
        }
        
        const searchLower = searchValue.toLowerCase();
        const labelMatch = option.label.toLowerCase().includes(searchLower);
        const valueMatch = option.value.toLowerCase().includes(searchLower);
        const searchTermsMatch = option.searchTerms?.some(term => 
          term && typeof term === 'string' && term.toLowerCase().includes(searchLower)
        );
        
        return labelMatch || valueMatch || searchTermsMatch;
      })
    : safeOptions;

  const selectedOption = safeOptions.find((option) => option?.value === value);

  const handleSelect = (optionValue: string) => {
    const newValue = optionValue === value ? "" : optionValue;
    onValueChange(newValue);
    setIsOpen(false);
    setSearchValue("");
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchValue("");
      }
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className={cn("w-full justify-between", className)}
        disabled={disabled}
        onClick={handleToggle}
        type="button"
      >
        {selectedOption ? selectedOption.label : placeholder}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[1001] mt-1 bg-popover border rounded-md shadow-lg">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
              autoFocus
            />
          </div>
          
          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                option && option.value && option.label ? (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === option.value && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 text-left">{option.label}</span>
                  </button>
                ) : null
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[1000]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
