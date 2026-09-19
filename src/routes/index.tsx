import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: FocusList,
  head: () => ({
    meta: [
      { title: "FocusList — Today's Ledger" },
      {
        name: "description",
        content:
          "FocusList is a calm, clutter-free to-do app. Add tasks, set priorities, filter, search, and track your progress — all saved on your device.",
      },
      { property: "og:title", content: "FocusList — Today's Ledger" },
      {
        property: "og:description",
        content:
          "A calm, clutter-free to-do app with priorities, filters, and stats. Your tasks stay saved on your device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,wght@1,500;1,600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
});

type Priority = "high" | "medium" | "low";
type StatusFilter = "all" | "active" | "completed";
type PriorityFilter = "all" | Priority;

interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
}

const STORAGE_KEY = "focuslist.tasks.v1";

const PRIORITY_META: Record<
  Priority,
  { label: string; chip: string; chipIdle: string }
> = {
  high: {
    label: "High",
    chip: "bg-pri-high-bg text-pri-high ring-pri-high-line",
    chipIdle: "ring-line text-muted-foreground",
  },
  medium: {
    label: "Medium",
    chip: "bg-pri-medium-bg text-pri-medium ring-pri-medium-line",
    chipIdle: "ring-line text-muted-foreground",
  },
  low: {
    label: "Low",
    chip: "bg-pri-low-bg text-pri-low ring-pri-low-line",
    chipIdle: "ring-line text-muted-foreground",
  },
};

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Task =>
        t && typeof t.id === "string" && typeof t.title === "string",
    );
  } catch {
    return [];
  }
}

function formatClock(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function FocusList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<Priority>("medium");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount (client only, avoids hydration mismatch)
  useEffect(() => {
    setTasks(loadTasks());
    setHydrated(true);
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, hydrated]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    return { total, completed, pending: total - completed };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter === "active" && t.completed) return false;
      if (statusFilter === "completed" && !t.completed) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter)
        return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        title,
        priority: draftPriority,
        completed: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setDraft("");
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditingText(task.title);
  }

  function commitEdit() {
    if (!editingId) return;
    const title = editingText.trim();
    if (title) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, title } : t)),
      );
    }
    setEditingId(null);
  }

  const completionPct =
    stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Header */}
        <header className="animate-rise flex items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                FocusList
              </span>
            </div>
            <h1 className="mt-2 font-serif text-3xl leading-none italic sm:text-4xl">
              Today's ledger
            </h1>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-muted-foreground">
              {hydrated ? formatDate(now) : " "}
            </div>
            <div className="mt-0.5 font-mono text-xs text-foreground">
              {hydrated ? formatClock(now) : " "}
            </div>
          </div>
        </header>

        {/* Stats */}
        <section
          className="animate-rise mt-6 grid grid-cols-3 gap-px overflow-hidden bg-line ring-1 ring-line"
          style={{ animationDelay: "0.06s" }}
          aria-label="Task statistics"
        >
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1 font-serif text-3xl">{stats.total}</div>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Completed
            </div>
            <div className="mt-1 font-serif text-3xl text-pri-low">
              {stats.completed}
            </div>
          </div>
          <div className="relative bg-surface px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Pending
            </div>
            <div className="mt-1 font-serif text-3xl">{stats.pending}</div>
            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-line">
              <div
                className="h-full origin-left bg-primary transition-transform duration-700"
                style={{ transform: `scaleX(${completionPct / 100})` }}
              />
            </div>
          </div>
        </section>

        {/* Search + filters */}
        <section
          className="animate-rise mt-6"
          style={{ animationDelay: "0.12s" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                /
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                aria-label="Search tasks"
                className="w-full rounded-md bg-surface py-2.5 pr-3 pl-8 text-sm ring-1 ring-line placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
            <div
              className="flex overflow-hidden rounded-md bg-surface ring-1 ring-line"
              role="group"
              aria-label="Filter by status"
            >
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["completed", "Completed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  aria-pressed={statusFilter === value}
                  className={`px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    statusFilter === value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by priority"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Priority
            </span>
            <button
              onClick={() => setPriorityFilter("all")}
              aria-pressed={priorityFilter === "all"}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                priorityFilter === "all"
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-surface text-muted-foreground ring-line hover:text-foreground"
              }`}
            >
              All
            </button>
            {(["high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() =>
                  setPriorityFilter(priorityFilter === p ? "all" : p)
                }
                aria-pressed={priorityFilter === p}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-opacity ${
                  PRIORITY_META[p].chip
                } ${priorityFilter === "all" || priorityFilter === p ? "" : "opacity-40"}`}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </section>

        {/* Add task */}
        <section
          className="animate-rise mt-4"
          style={{ animationDelay: "0.18s" }}
        >
          <form
            onSubmit={addTask}
            className="flex flex-wrap items-center gap-2.5 rounded-md bg-surface px-3 py-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-ring"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task to the ledger…"
              aria-label="New task title"
              className="min-w-40 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex gap-1.5" role="group" aria-label="New task priority">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraftPriority(p)}
                  aria-pressed={draftPriority === p}
                  className={`rounded px-2 py-1 text-[11px] font-medium ring-1 transition-colors ${
                    draftPriority === p
                      ? PRIORITY_META[p].chip
                      : "text-muted-foreground ring-line hover:text-foreground"
                  }`}
                >
                  {p === "medium" ? "Med" : PRIORITY_META[p].label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Add
            </button>
          </form>
        </section>

        {/* Task list */}
        <section
          className="animate-rise mt-5"
          style={{ animationDelay: "0.24s" }}
          aria-label="Task list"
        >
          {visibleTasks.length === 0 ? (
            <div className="rounded-lg bg-surface px-4 py-10 text-center ring-1 ring-line">
              <p className="font-serif text-lg italic text-muted-foreground">
                {tasks.length === 0
                  ? "The ledger is empty. Add your first task above."
                  : "No tasks match the current filters."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleTasks.map((task) => {
                const meta = PRIORITY_META[task.priority];
                const editing = editingId === task.id;
                return (
                  <li
                    key={task.id}
                    className={`group flex items-center gap-3 rounded-lg bg-surface px-3 py-3 ring-1 ring-line transition hover:ring-primary/30 ${
                      task.completed ? "opacity-70" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={
                        task.completed
                          ? `Mark "${task.title}" as active`
                          : `Mark "${task.title}" as completed`
                      }
                      className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] ring-1 transition-colors ${
                        task.completed
                          ? "bg-pri-low ring-pri-low-line"
                          : "ring-line hover:ring-primary/50"
                      }`}
                    >
                      {task.completed && (
                        <span className="text-[11px] leading-none text-primary-foreground">
                          ✓
                        </span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <input
                          ref={editInputRef}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          aria-label="Edit task title"
                          className="w-full bg-transparent text-sm font-medium ring-1 ring-ring rounded px-1.5 py-0.5 focus:outline-none"
                        />
                      ) : (
                        <div
                          onDoubleClick={() => !task.completed && startEdit(task)}
                          className={`truncate text-sm font-medium ${
                            task.completed
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {task.title}
                        </div>
                      )}
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {task.completed
                          ? "done"
                          : formatClock(new Date(task.createdAt))}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${meta.chip}`}
                    >
                      {meta.label}
                    </span>

                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {!editing && (
                        <button
                          onClick={() => startEdit(task)}
                          aria-label={`Edit "${task.title}"`}
                          className="rounded px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => deleteTask(task.id)}
                        aria-label={`Delete "${task.title}"`}
                        className="rounded px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                      >
                        Del
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Synced to this device · {stats.total}{" "}
          {stats.total === 1 ? "entry" : "entries"}
        </p>
      </div>
    </div>
  );
}
