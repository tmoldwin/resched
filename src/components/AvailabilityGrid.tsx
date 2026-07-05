"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  buildSlotGrid,
  countAvailable,
  normalizeSlots,
  slotIndex,
} from "@/lib/slots";
import type { EventResponse, ParticipantResponse } from "@/lib/types";

type AvailabilityGridProps = {
  event: EventResponse;
  activeParticipant?: ParticipantResponse | null;
  editToken?: string | null;
  password?: string | null;
  onSaved?: (participant: ParticipantResponse & { editToken: string }) => void;
};

type GridCell = {
  dayIndex: number;
  slotInDay: number;
  index: number;
};

function heatColor(count: number, total: number) {
  if (count <= 0 || total <= 0) return "rgb(244 244 245)";
  const ratio = count / total;
  const alpha = 0.18 + ratio * 0.72;
  return `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
}

function selectionColor(selected: boolean) {
  return selected ? "rgb(16 185 129)" : "rgb(250 250 250)";
}

export default function AvailabilityGrid({
  event,
  activeParticipant,
  editToken,
  password,
  onSaved,
}: AvailabilityGridProps) {
  const grid = useMemo(
    () =>
      buildSlotGrid(
        event.startDate,
        event.endDate,
        event.dayStartMinutes,
        event.dayEndMinutes,
        event.slotMinutes,
      ),
    [event],
  );

  const [mode, setMode] = useState<"edit" | "group">(
    activeParticipant ? "edit" : "group",
  );
  const [draftSlots, setDraftSlots] = useState<boolean[]>(() =>
    normalizeSlots(activeParticipant?.slots ?? [], grid.totalSlots),
  );
  const [paintValue, setPaintValue] = useState(true);
  const [isPainting, setIsPainting] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftSlots(
      normalizeSlots(activeParticipant?.slots ?? [], grid.totalSlots),
    );
  }, [activeParticipant, grid.totalSlots]);

  const availabilityCounts = useMemo(() => {
    const counts = Array.from({ length: grid.totalSlots }, () => 0);
    for (const participant of event.participants) {
      participant.slots.forEach((available, index) => {
        if (available) counts[index] += 1;
      });
    }
    return counts;
  }, [event.participants, grid.totalSlots]);

  const namesBySlot = useMemo(() => {
    return Array.from({ length: grid.totalSlots }, (_, index) =>
      event.participants
        .filter((participant) => participant.slots[index])
        .map((participant) => participant.name),
    );
  }, [event.participants, grid.totalSlots]);

  const applyPaint = useCallback(
    (cell: GridCell) => {
      setDraftSlots((current) => {
        const next = current.slice();
        next[cell.index] = paintValue;
        return next;
      });
    },
    [paintValue],
  );

  const resolveCellFromPoint = useCallback(
    (clientX: number, clientY: number): GridCell | null => {
      const target = document.elementFromPoint(clientX, clientY);
      if (!target || !(target instanceof HTMLElement)) return null;
      const button = target.closest("[data-slot-index]");
      if (!button || !(button instanceof HTMLElement)) return null;

      const index = Number(button.dataset.slotIndex);
      const dayIndex = Number(button.dataset.dayIndex);
      const slotInDay = Number(button.dataset.slotInDay);
      if (Number.isNaN(index)) return null;

      return { index, dayIndex, slotInDay };
    },
    [],
  );

  function handlePointerDown(
    cell: GridCell,
    pointerEvent: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (mode !== "edit" || !activeParticipant) return;

    pointerEvent.preventDefault();
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    setIsPainting(true);
    setPaintValue(!draftSlots[cell.index]);
    applyPaint(cell);
  }

  function handlePointerEnter(
    cell: GridCell,
    pointerEvent: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (mode === "group") {
      const names = namesBySlot[cell.index];
      setTooltip(
        names.length > 0
          ? `${names.length} available: ${names.join(", ")}`
          : "Nobody available",
      );
      return;
    }

    if (!isPainting) return;
    pointerEvent.preventDefault();
    applyPaint(cell);
  }

  function handlePointerUp(pointerEvent: ReactPointerEvent<HTMLButtonElement>) {
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    setIsPainting(false);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function preventScroll(event: TouchEvent) {
      if (isPainting) event.preventDefault();
    }

    container.addEventListener("touchmove", preventScroll, { passive: false });
    return () => container.removeEventListener("touchmove", preventScroll);
  }, [isPainting]);

  async function saveAvailability() {
    if (!activeParticipant?.name.trim()) {
      setSaveMessage("Enter your name before saving.");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(`/api/events/${event.slug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeParticipant.name,
          slots: draftSlots,
          editToken: editToken || undefined,
          password: password || undefined,
        }),
      });

      const data = (await response.json()) as {
        id: string;
        name: string;
        editToken: string;
        slots: boolean[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not save availability.");
      }

      onSaved?.({
        id: data.id,
        name: data.name,
        editToken: data.editToken,
        slots: data.slots,
        updatedAt: new Date().toISOString(),
      });
      setSaveMessage("Saved.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Could not save availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = countAvailable(draftSlots);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-zinc-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            disabled={!activeParticipant}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === "edit"
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            Your times
          </button>
          <button
            type="button"
            onClick={() => setMode("group")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === "group"
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Group heatmap
          </button>
        </div>

        {mode === "edit" ? (
          <div className="text-sm text-zinc-600">
            Drag to mark when you&apos;re free · {selectedCount} slots selected
          </div>
        ) : (
          <div className="text-sm text-zinc-600">
            Darker green = more people free · {event.participants.length} responses
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="overflow-auto rounded-3xl border border-zinc-200 bg-white shadow-sm"
        style={{ touchAction: isPainting ? "none" : "pan-x pan-y" }}
      >
        <div className="min-w-max">
          <div
            className="sticky top-0 z-20 grid border-b border-zinc-200 bg-zinc-50"
            style={{
              gridTemplateColumns: `4.5rem repeat(${grid.days.length}, minmax(3.5rem, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-30 border-r border-zinc-200 bg-zinc-50 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Time
            </div>
            {grid.days.map((day) => (
              <div
                key={day.date}
                className="px-2 py-3 text-center text-xs font-semibold text-zinc-700 sm:text-sm"
              >
                <div>{day.shortLabel}</div>
                <div className="hidden text-zinc-500 sm:block">{day.label}</div>
              </div>
            ))}
          </div>

          {Array.from({ length: grid.slotsPerDay }, (_, slotInDay) => (
            <div
              key={slotInDay}
              className="grid border-b border-zinc-100 last:border-b-0"
              style={{
                gridTemplateColumns: `4.5rem repeat(${grid.days.length}, minmax(3.5rem, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 sm:text-xs">
                {grid.timeLabels[slotInDay]}
              </div>

              {grid.days.map((day, dayIndex) => {
                const index = slotIndex(dayIndex, slotInDay, grid.slotsPerDay);
                const selected = draftSlots[index];
                const count = availabilityCounts[index];

                return (
                  <button
                    key={`${day.date}-${slotInDay}`}
                    type="button"
                    data-slot-index={index}
                    data-day-index={dayIndex}
                    data-slot-in-day={slotInDay}
                    aria-label={`${day.label} ${grid.timeLabels[slotInDay]}`}
                    onPointerDown={(pointerEvent) =>
                      handlePointerDown(
                        { index, dayIndex, slotInDay },
                        pointerEvent,
                      )
                    }
                    onPointerEnter={(pointerEvent) =>
                      handlePointerEnter(
                        { index, dayIndex, slotInDay },
                        pointerEvent,
                      )
                    }
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => setTooltip(null)}
                    className="h-11 border-r border-zinc-100 last:border-r-0 sm:h-10"
                    style={{
                      backgroundColor:
                        mode === "group"
                          ? heatColor(count, event.participants.length)
                          : selectionColor(selected),
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip ? (
        <div className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm text-white">
          {tooltip}
        </div>
      ) : null}

      {mode === "edit" && activeParticipant ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save availability"}
          </button>
          {saveMessage ? (
            <span className="text-sm text-zinc-600">{saveMessage}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
