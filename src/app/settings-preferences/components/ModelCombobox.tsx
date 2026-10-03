'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

/**
 * A searchable model picker.
 *
 * A native <select> cannot filter, and the provider returns long model lists where the one you
 * want is rarely at the top — so the list is rendered here and filtered as you type. The search box
 * is an <input> inside the popover, which keeps the trigger itself a single button and preserves
 * the visual language of the other settings dropdowns.
 *
 * `onAddCustom` is the escape hatch for a model the provider did not return: the trailing "add"
 * row hands the typed text back to the caller instead of silently discarding it.
 */
export default function ModelCombobox({
  value,
  options,
  onChange,
  onAddCustom,
  labels,
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onAddCustom: (value: string) => void;
  labels: {
    searchPlaceholder: string;
    noResults: string;
    addCustom: string;
    triggerLabel: string;
  };
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Case-insensitive substring match. Model IDs are conventionally lowercase with dashes, so
  // matching the typed text anywhere in the ID is what people expect.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  const canAdd = query.trim().length > 0 && !options.includes(query.trim());

  // Opening focuses the search box so typing filters straight away.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlighted(0);
    searchRef.current?.focus();
  }, [open]);

  // A click anywhere else dismisses the popover; without this the list stays open behind the
  // rest of the settings panel.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Keep the keyboard-highlighted row inside the filtered list.
  useEffect(() => {
    setHighlighted((current) => (current < matches.length ? current : 0));
  }, [matches.length]);

  // Scroll the highlighted row into view when navigating by keyboard.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const addCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onAddCustom(trimmed);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    // The custom row sits just past the end of the results, so ArrowDown can reach it.
    const rowCount = matches.length + (canAdd ? 1 : 0);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlighted((current) => (rowCount === 0 ? 0 : (current + 1) % rowCount));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlighted((current) => (rowCount === 0 ? 0 : (current - 1 + rowCount) % rowCount));
        break;
      case 'Enter':
        event.preventDefault();
        if (canAdd && highlighted >= matches.length) addCustom();
        else if (matches[highlighted]) choose(matches[highlighted]);
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.triggerLabel}
        onClick={() => setOpen((current) => !current)}
        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input border border-border text-sm text-foreground shadow-sm hover:border-primary/50 hover:bg-muted transition-all duration-150 w-[300px] justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:opacity-50"
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="animate-dropdown absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-2xl ring-1 ring-black/5 z-50 p-1 w-[300px]">
          <div className="relative px-1 pb-1">
            <Search
              size={13}
              aria-hidden="true"
              className="absolute left-3 bottom-2.5 text-muted-foreground pointer-events-none"
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlighted(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchPlaceholder}
              aria-controls="model-combobox-list"
              className="w-full pl-7 pr-2 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div
            ref={listRef}
            id="model-combobox-list"
            role="listbox"
            aria-label={labels.triggerLabel}
            className="max-h-[min(16rem,50vh)] overflow-y-auto scrollbar-thin"
          >
            {matches.map((option, index) => (
              <button
                key={`model-${option}`}
                type="button"
                role="option"
                aria-selected={value === option}
                data-index={index}
                // Pointer-down would dismiss the popover before the click landed.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(option)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left rounded-md transition-colors ${
                  highlighted === index
                    ? 'bg-muted text-foreground'
                    : value === option
                      ? 'text-primary bg-primary/10 font-medium'
                      : 'text-foreground'
                }`}
              >
                {value === option ? (
                  <Check size={12} aria-hidden="true" className="text-primary flex-shrink-0" />
                ) : (
                  <span className="w-3 flex-shrink-0" />
                )}
                <span className="truncate">{option}</span>
              </button>
            ))}

            {canAdd && (
              <button
                type="button"
                role="option"
                aria-selected={false}
                data-index={matches.length}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlighted(matches.length)}
                onClick={addCustom}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left rounded-md transition-colors ${
                  highlighted === matches.length
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="w-3 flex-shrink-0" />
                <Plus size={12} aria-hidden="true" className="flex-shrink-0" />
                <span className="truncate">
                  {labels.addCustom}:{' '}
                  <span className="font-medium text-foreground">{query.trim()}</span>
                </span>
              </button>
            )}

            {matches.length === 0 && !canAdd && (
              <p className="px-2.5 py-3 text-sm text-muted-foreground">{labels.noResults}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
