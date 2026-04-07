"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { GeoSuggestion } from "@/app/api/geo/suggestions/route";

interface CityAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // Cancel any in-flight request so stale responses can't overwrite newer ones
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(
        `/api/geo/suggestions?q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal },
      );
      if (!res.ok) return;
      const data = (await res.json()) as GeoSuggestion[];
      setSuggestions(data);
      setOpen(data.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Other network errors — ignore silently
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleSelect(suggestion: GeoSuggestion) {
    onChange(suggestion.city);
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Cleanup debounce and in-flight request on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined
        }
      />
      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.postalCode}-${s.city}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => handleSelect(s)}
              className={
                i === activeIndex
                  ? "cursor-pointer px-3 py-2 text-sm bg-accent text-accent-foreground"
                  : "cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              }
            >
              <span className="font-mono text-xs text-muted-foreground mr-2">
                {s.postalCode}
              </span>
              {s.city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
