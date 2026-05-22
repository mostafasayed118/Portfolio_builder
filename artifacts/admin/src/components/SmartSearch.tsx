import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input, Button } from "@workspace/ui";

interface SmartSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  initialValue?: string;
  onFilterClick?: () => void;
  showFilterButton?: boolean;
  className?: string;
}

export function SmartSearch({
  placeholder = "Search...",
  onSearch,
  debounceMs = 300,
  initialValue = "",
  onFilterClick,
  showFilterButton = false,
  className,
}: SmartSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsSearching(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(value);
      setIsSearching(false);
    }, debounceMs);
  }, [onSearch, debounceMs]);

  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("");
    setIsSearching(false);
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          className="pl-9 pr-9"
          data-search-input
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Clear search" // STANDARDIZED: Type G — clear search
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showFilterButton && (
        <Button variant="outline" size="icon" onClick={() => onFilterClick?.()} className="min-h-[44px] min-w-[44px]" aria-label="Open filters">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface FilterState {
  [key: string]: string | number | boolean | null;
}

interface SmartFilterBarProps {
  filters: { key: string; label: string; options: { value: string; label: string }[] }[];
  activeFilters: FilterState;
  onFilterChange: (key: string, value: string | null) => void;
  onClearFilters: () => void;
}

export function SmartFilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
}: SmartFilterBarProps) {
  const hasActiveFilters = Object.values(activeFilters).some(v => v !== null && v !== "");

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={activeFilters[filter.key] as string || ""}
          onChange={(e) => onFilterChange(filter.key, e.target.value || null)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label={`Filter by ${filter.label}`} // FIX: UX-032
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}