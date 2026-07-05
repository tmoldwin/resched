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

function heatColor(count: number, total: number) {
  if (count <= 0 || total <= 0) return "#f4f4f5";
  const ratio = count / total;
  const alpha = 0.2 + ratio * 0.75;
  return `rgba(22, 163, 74, ${alpha.toFixed(3)})`;
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

  const [mode, setMode] = useState<"edit" | "group">("edit");
  const [draftSlots, setDraftSlots] = useState<boolean[]>(() =>
    normalizeSlots(activeParticipant?.slots ?? [], grid.totalSlots),
  );
  const [isPainting, setIsPainting] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const paintingRef = useRef(false);
  const paintValueRef = useRef(true);
  const lastPaintedRef = useRef<number | null>(null);
  const draftSlotsRef = useRef(draftSlots);

  useEffect(() => {
    draftSlotsRef.current = draftSlots;
  }, [draftSlots]);

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

  const resolveIndexFromPoint = useCallback((clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    if (!target || !(target instanceof HTMLElement)) return null;
    const cell = target.closest("[data-slot-index]");
    if (!cell || !(cell instanceof HTMLElement)) return null;
    if (!gridRef.current?.contains(cell)) return null;

    const index = Number(cell.dataset.slotIndex);
    return Number.isNaN(index) ? null : index;
  }, []);

  const paintIndex = useCallback((index: number) => {
    if (lastPaintedRef.current === index) return;
    lastPaintedRef.current = index;

    setDraftSlots((current) => {
      if (current[index] === paintValueRef.current) return current;
      const next = current.slice();
      next[index] = paintValueRef.current;
      return next;
    });
  }, []);

  const stopPainting = useCallback(() => {
    paintingRef.current = false;
    lastPaintedRef.current = null;
    setIsPainting(false);
  }, []);

  useEffect(() => {
    if (mode !== "edit") return;

    function onPointerMove(event: PointerEvent) {
      if (!paintingRef.current) return;
      event.preventDefault();
      const index = resolveIndexFromPoint(event.clientX, event.clientY);
      if (index !== null) paintIndex(index);
    }

    function onPointerEnd() {
      stopPainting();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [mode, paintIndex, resolveIndexFromPoint, stopPainting]);

  function startPainting(
    index: number,
    pointerEvent: ReactPointerEvent<HTMLElement>,
  ) {
    if (mode !== "edit") return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const nextValue = !draftSlotsRef.current[index];
    paintValueRef.current = nextValue;
    paintingRef.current = true;
    lastPaintedRef.current = null;
    setIsPainting(true);
    paintIndex(index);

    if (gridRef.current) {
      gridRef.current.setPointerCapture(pointerEvent.pointerId);
    }
  }

  function showTooltip(index: number) {
    if (mode !== "group") return;
    const names = namesBySlot[index];
    setTooltip(
      names.length > 0
        ? `${names.length} available: ${names.join(", ")}`
        : "Nobody available",
    );
  }

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
  const canEdit = mode === "edit";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "edit"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Your times
          </button>
          <button
            type="button"
            onClick={() => setMode("group")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "group"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Group view
          </button>
        </div>

        <p className="text-sm text-zinc-500">
          {mode === "edit"
            ? `Drag across the grid to mark when you're free · ${selectedCount} slots`
            : `Darker green = more overlap · ${event.participants.length} responses`}
        </p>
      </div>

      <div
        ref={gridRef}
        className={`overflow-auto rounded-lg border border-zinc-200 bg-white ${
          canEdit ? "select-none" : ""
        }`}
        style={{ touchAction: canEdit ? "none" : "pan-x pan-y" }}
        onPointerUp={stopPainting}
      >
        <div className="min-w-max">
          <div
            className="sticky top-0 z-20 grid border-b border-zinc-200 bg-zinc-100/90 backdrop-blur"
            style={{
              gridTemplateColumns: `4rem repeat(${grid.days.length}, minmax(2.75rem, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-30 border-r border-zinc-200 bg-zinc-100 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Time
            </div>
            {grid.days.map((day) => (
              <div
                key={day.date}
                className="border-r border-zinc-200 px-1 py-2 text-center text-xs font-medium text-zinc-700 last:border-r-0"
              >
                <div>{day.shortLabel}</div>
                <div className="hidden text-[10px] text-zinc-500 sm:block">
                  {day.label}
                </div>
              </div>
            ))}
          </div>

          {Array.from({ length: grid.slotsPerDay }, (_, slotInDay) => (
            <div
              key={slotInDay}
              className="grid border-b border-zinc-100 last:border-b-0"
              style={{
                gridTemplateColumns: `4rem repeat(${grid.days.length}, minmax(2.75rem, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-2 py-0 text-[11px] leading-10 text-zinc-500">
                {grid.timeLabels[slotInDay]}
              </div>

              {grid.days.map((day, dayIndex) => {
                const index = slotIndex(dayIndex, slotInDay, grid.slotsPerDay);
                const selected = draftSlots[index];
                const count = availabilityCounts[index];

                return (
                  <div
                    key={`${day.date}-${slotInDay}`}
                    role="button"
                    tabIndex={canEdit ? 0 : -1}
                    data-slot-index={index}
                    aria-label={`${day.label} ${grid.timeLabels[slotInDay]}`}
                    aria-pressed={canEdit ? selected : undefined}
                    onPointerDown={(pointerEvent) =>
                      startPainting(index, pointerEvent)
                    }
                    onPointerEnter={() => showTooltip(index)}
                    onPointerLeave={() => setTooltip(null)}
                    className={`h-10 border-r border-zinc-100 last:border-r-0 ${
                      canEdit ? "cursor-crosshair active:opacity-90" : "cursor-default"
                    }`}
                    style={{
                      backgroundColor:
                        mode === "group"
                          ? heatColor(count, event.participants.length)
                          : selected
                            ? "#16a34a"
                            : "#fafafa",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white">
          {tooltip}
        </p>
      ) : null}

      {mode === "edit" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save availability"}
          </button>
          {saveMessage ? (
            <span className="text-sm text-zinc-500">{saveMessage}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
