/**
 * Database Assistant History Panel Container
 *
 * Renders as a sidebar on wide screens (≥1024px) or a dismissible drawer on mobile.
 * Shows conversation list, search, new-chat button, and management actions.
 * Signed out, it renders a placeholder instead of the list; guests get their own partition.
 *
 * Styling uses the shared design tokens only — no hardcoded palette values — so the panel follows
 * the light/dark theme with the rest of the app.
 *
 * (FR-038, FR-039, SC-013, SC-014)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X,
  Plus,
  Search,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { useDatabaseAssistantHistoryStore } from '@/lib/conversationHistoryStore';
import { getCachedHistoryIdentity } from '@/lib/ai/databaseAssistant/chatHistoryIdentity';
import {
  groupConversationsByRecency,
  searchConversations,
} from '@/lib/ai/databaseAssistant/chatHistoryHelpers';
import { getT } from '@/lib/i18n';

/**
 * Where the user's chosen sidebar width is remembered between visits.
 *
 * View-local state, not an app preference: it only means something on this page, so it is kept out
 * of `AppSettings` (which is the user-facing preferences screen) and stored directly in localStorage.
 */
const SIDEBAR_WIDTH_KEY = 'sqlvisualizer:db-assistant:sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 256;
/** Below this the conversation titles truncate to nothing useful; above it the chat gets cramped. */
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 480;

/** Reads the remembered width, ignoring anything out of range or unparseable. */
function readStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_WIDTH;
    return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed));
  } catch {
    // Storage blocked: fall back to the default rather than failing to render.
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

/**
 * Main history panel component.
 * Integrates conversation list, search, new-chat, and recency grouping.
 */
export function DatabaseAssistantHistoryPanel() {
  const appStore = useAppStore();
  const t = getT(appStore.settings.locale);
  const store = useDatabaseAssistantHistoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // `false` until the stored width is read, so the first paint cannot show the wrong width and then
  // jump — the same reason the screen-size probe below defers to an effect.
  const [width, setWidth] = useState<number | false>(false);
  const identityKey = getCachedHistoryIdentity();
  const lastIdentityRef = useRef<string | null | undefined>(undefined);

  // Restore the remembered width after mount (browser storage is unavailable during prerender).
  useEffect(() => {
    setWidth(readStoredWidth());
  }, []);

  // Live drag width, committed to `width` only on pointer-up. Dragging a React state value on every
  // pointermove would re-render the whole conversation list on each frame.
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    // `width` is `number | false` (false = not yet read from storage), so `??` cannot narrow it.
    const startWidth = dragWidth ?? (typeof width === 'number' ? width : DEFAULT_SIDEBAR_WIDTH);

    // Clamped against the viewport so the sidebar can never be dragged wider than the window itself,
    // which would push the chat column off-screen.
    const onMove = (moveEvent: PointerEvent) => {
      const next = startWidth + (moveEvent.clientX - startX);
      const maxByViewport = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 320);
      setDragWidth(Math.min(Math.max(next, MIN_SIDEBAR_WIDTH), Math.max(maxByViewport, MIN_SIDEBAR_WIDTH)));
    };

    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      setDragWidth((current) => {
        if (current !== null) {
          try {
            window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(current));
          } catch {
            // A blocked store only costs persistence, not the resize itself.
          }
          setWidth(current);
          return null;
        }
        return null;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
  };

  // Initialize on mount, and re-partition whenever the identity changes (sign-in/sign-out/expiry).
  // The guard on `isInitialized` alone would keep the previous identity's conversations on screen,
  // so the change is detected explicitly and routed through `resetForIdentity` (FR-043).
  useEffect(() => {
    if (lastIdentityRef.current === undefined) {
      // First run: plain hydration, whatever identity is present (possibly none).
      lastIdentityRef.current = identityKey;
      store.initializeHistory(identityKey);
      return;
    }
    if (lastIdentityRef.current !== identityKey) {
      lastIdentityRef.current = identityKey;
      store.resetForIdentity(identityKey);
    }
  }, [identityKey, store]);

  // Detect screen size for responsive layout
  useEffect(() => {
    const handleResize = () => setIsWideScreen(window.innerWidth >= 1024);
    handleResize(); // Call once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // A session that can own a persisted partition: signed-in (social/demo) or guest.
  const canPersist = identityKey !== null;

  // Storage unavailable: render empty disabled state
  if (canPersist && !store.isStorageAvailable) {
    return (
      <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
        <span>{t.dbAssistantHistoryStorageUnavailable}</span>
      </div>
    );
  }

  // Nobody signed in at all: the panel still renders as a stable, styled placeholder so the
  // layout does not shift when a session is established.
  if (!canPersist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MessageSquare size={18} />
        </span>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">{t.dbAssistantHistoryTitle}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.dbAssistantHistoryGuestNotice}
          </p>
        </div>
      </div>
    );
  }

  // Filtered conversations based on search
  const filtered = searchConversations(store.conversations, searchQuery);
  const grouped = groupConversationsByRecency(filtered);

  const handleNewChat = () => {
    store.createNewConversation();
    if (!isWideScreen) setIsDrawerOpen(false); // Close drawer after creating
  };

  const handleSelectConversation = (conversationId: string) => {
    store.setActiveConversation(conversationId);
    if (!isWideScreen) setIsDrawerOpen(false); // Close drawer after selecting
  };

  const panelContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {t.dbAssistantHistoryTitle}
          </h2>
          {/* `PanelLeftClose/Open` rather than a bare chevron: the app sidebar already collapses with
              `ChevronLeft`, and two identical chevrons side by side made it unclear which one was
              being acted on. The panel-shaped icon says "this panel" unambiguously. */}
          {isWideScreen && (
            <button
              onClick={() => setIsCollapsed((value) => !value)}
              title={isCollapsed ? t.dbAssistantHistoryExpand : t.dbAssistantHistoryCollapse}
              aria-label={isCollapsed ? t.dbAssistantHistoryExpand : t.dbAssistantHistoryCollapse}
              aria-expanded={!isCollapsed}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          {t.dbAssistantHistoryNewChat}
        </button>
      </div>

      {/* Search Box */}
      <div className="flex-shrink-0 border-b border-border p-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder={t.dbAssistantHistorySearch}
            aria-label={t.dbAssistantHistorySearch}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label={t.dbAssistantHistorySearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {store.conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t.dbAssistantHistoryEmpty}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t.dbAssistantHistoryNoMatch}
          </div>
        ) : (
          <>
            {/* Today */}
            {grouped.today.length > 0 && (
              <ConversationGroup
                title={t.dbAssistantHistoryToday}
                conversations={grouped.today}
                activeId={store.activeConversationId}
                onSelect={handleSelectConversation}
                onRename={(id, title) => store.renameConversation(id, title)}
                onDelete={(id) => store.deleteConversation(id)}
                t={t}
              />
            )}

            {/* Yesterday */}
            {grouped.yesterday.length > 0 && (
              <ConversationGroup
                title={t.dbAssistantHistoryYesterday}
                conversations={grouped.yesterday}
                activeId={store.activeConversationId}
                onSelect={handleSelectConversation}
                onRename={(id, title) => store.renameConversation(id, title)}
                onDelete={(id) => store.deleteConversation(id)}
                t={t}
              />
            )}

            {/* Previous 7 Days */}
            {grouped.previousSevenDays.length > 0 && (
              <ConversationGroup
                title={t.dbAssistantHistoryPreviousSevenDays}
                conversations={grouped.previousSevenDays}
                activeId={store.activeConversationId}
                onSelect={handleSelectConversation}
                onRename={(id, title) => store.renameConversation(id, title)}
                onDelete={(id) => store.deleteConversation(id)}
                t={t}
              />
            )}

            {/* Older */}
            {grouped.older.length > 0 && (
              <ConversationGroup
                title={t.dbAssistantHistoryOlder}
                conversations={grouped.older}
                activeId={store.activeConversationId}
                onSelect={handleSelectConversation}
                onRename={(id, title) => store.renameConversation(id, title)}
                onDelete={(id) => store.deleteConversation(id)}
                t={t}
              />
            )}
          </>
        )}
      </div>

      {/* Footer: Clear All */}
      {store.conversations.length > 0 && (
        <div className="flex-shrink-0 border-t border-border p-3">
          <button
            onClick={() => {
              if (confirm(t.dbAssistantHistoryClearAllConfirm)) {
                store.clearAllConversations();
              }
            }}
            className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            {t.dbAssistantHistoryClearAll}
          </button>
        </div>
      )}
    </div>
  );

  // Wide screen: inline sidebar. Owns its own width since the parent no longer wraps it.
  // `h-full` (not a viewport calc): AppLayout is already `h-screen` with the scroll container inside
  // it, so this panel simply fills the row it is given instead of guessing at a header height that
  // this page does not have.
  if (isWideScreen) {
    // Before the stored width is read, fall back to the default rather than rendering a wrong width.
    const resolvedWidth = dragWidth ?? (typeof width === 'number' ? width : DEFAULT_SIDEBAR_WIDTH);

    return (
      <>
        <aside
          style={{ width: isCollapsed ? undefined : `${resolvedWidth}px` }}
          // While collapsed the panel is visually gone, so it must also leave the accessibility tree.
          // The toggle and the resize handle are deliberately siblings of this element rather than
          // children: anything inside would become unreachable, leaving no way to expand it again.
          aria-hidden={isCollapsed || undefined}
          className={`flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card ${
            isCollapsed ? 'w-0 border-r-0' : ''
          }`}
        >
          {panelContent}
        </aside>

        {/* Drag handle: a real `separator` with arrow-key support, so the width is reachable without
            a pointer. It sits outside the sidebar so it stays grabbable when the panel is collapsed. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t.dbAssistantHistoryResize}
          aria-valuenow={isCollapsed ? undefined : Math.round(resolvedWidth)}
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          tabIndex={0}
          onPointerDown={startResize}
          onDoubleClick={() => {
            setWidth(DEFAULT_SIDEBAR_WIDTH);
            try {
              window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
            } catch {
              // Nothing to clean up if storage is blocked.
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              const step = event.shiftKey ? 32 : 8;
              const delta = event.key === 'ArrowRight' ? step : -step;
              setWidth((current) => {
                const base = typeof current === 'number' ? current : DEFAULT_SIDEBAR_WIDTH;
                return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, base + delta));
              });
            }
          }}
          className="group relative w-1 flex-shrink-0 cursor-col-resize self-stretch bg-border/40 transition-colors hover:bg-primary/60 focus-visible:bg-primary focus-visible:outline-none"
        >
          {/* Expand affordance, shown only while collapsed. It has to live out here (see above),
              and is a plain tab stop rather than a second toggle, so the header button is the one
              control that reflects the expanded state. */}
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              title={t.dbAssistantHistoryExpand}
              aria-label={t.dbAssistantHistoryExpand}
              className="absolute left-0 top-3 flex h-8 w-5 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}
        </div>
      </>
    );
  }

  // Mobile: drawer
  return (
    <>
      {/* Drawer Button */}
      <button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90 md:hidden"
        aria-label={t.dbAssistantHistoryToggle}
        aria-expanded={isDrawerOpen}
      >
        <ChevronDown size={20} />
      </button>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden">
          <div className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-border bg-card">
            {panelContent}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * A group of conversations under a recency heading.
 */
function ConversationGroup({
  title,
  conversations,
  activeId,
  onSelect,
  onRename,
  onDelete,
  t,
}: {
  title: string;
  conversations: any[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  t: any;
}) {
  return (
    <div>
      <h3 className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeId}
          onSelect={() => onSelect(conv.id)}
          onRename={(newTitle) => onRename(conv.id, newTitle)}
          onDelete={() => onDelete(conv.id)}
          t={t}
        />
      ))}
    </div>
  );
}

/**
 * A single conversation item in the list.
 */
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  t,
}: {
  conversation: any;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  t: any;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);

  return (
    <div
      className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      {isRenaming ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            onBlur={() => {
              if (newTitle.trim() && newTitle !== conversation.title) {
                onRename(newTitle.trim());
              }
              setNewTitle(conversation.title);
              setIsRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (newTitle.trim() && newTitle !== conversation.title) {
                  onRename(newTitle.trim());
                }
                setNewTitle(conversation.title);
                setIsRenaming(false);
              } else if (e.key === 'Escape') {
                setNewTitle(conversation.title);
                setIsRenaming(false);
              }
            }}
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          />
        </div>
      ) : (
        <div
          onClick={onSelect}
          className="flex items-center justify-between gap-2 group"
        >
          <span className="flex-1 text-sm truncate">{conversation.title}</span>
          <div className="flex flex-col gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              title={t.dbAssistantHistoryRename}
              aria-label={t.dbAssistantHistoryRename}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(t.dbAssistantHistoryDeleteConfirm)) {
                  onDelete();
                }
              }}
              title={t.dbAssistantHistoryDelete}
              aria-label={t.dbAssistantHistoryDelete}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
