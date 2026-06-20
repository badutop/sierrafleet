import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * Autocomplete input with dropdown suggestions.
 * Props:
 *   value: string (displayed text)
 *   onChange: (text) => void  — called on every keystroke
 *   onSelect: (item) => void  — called when an item is picked
 *   options: { id, label, sublabel? }[]
 *   placeholder: string
 *   className: string
 */
export default function Autocomplete({ value, onChange, onSelect, options = [], placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes((value || "").toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes((value || "").toLowerCase()))
  ).slice(0, 8);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (filtered[highlighted]) { onSelect(filtered[highlighted]); setOpen(false); } }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        className={className}
        placeholder={placeholder}
        value={value || ""}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors",
                idx === highlighted ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
              onMouseDown={(e) => { e.preventDefault(); onSelect(item); setOpen(false); }}
              onMouseEnter={() => setHighlighted(idx)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.label}</div>
                {item.sublabel && <div className="text-xs text-muted-foreground truncate">{item.sublabel}</div>}
              </div>
              {value && item.label.toLowerCase() === value.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}