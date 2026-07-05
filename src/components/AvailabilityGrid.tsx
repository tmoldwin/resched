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
  formatMinutes24,
  normalizeSlots,
  rowBorderColor,
  slotIndex,
  slotStartMinutes,
  type SlotGridMeta,
} from "@/lib/slots";
import type { EventResponse, ParticipantResponse } from "@/lib/types";

type AvailabilityGridProps = {
  event: EventResponse;
  activeParticipant?: ParticipantResponse | null;
  editToken?: string | null;
  password?: string | null;
  onSaved?: (participant: ParticipantResponse & { editToken: string }) => void;
};

type PaintAnchor = {
  dayIndex: number;
  slotInDay: number;
};

const SELECTED_COLOR = "#16a34a";
const EMPTY_COLOR = "#fafafa";
const DAY_LINE = "#d4d4d8";
const TIME_COLUMN = "3rem";
const SCROLL_MARGIN_CLASS =
  "sticky z-40 w-16 shrink-0 touch-pan-x touch-pan-y self-stretch sm:w-10";

function heatColor(count: number, total: number) {
  if (count <= 0) return EMPTY_COLOR;
  const effectiveTotal = Math.max(total, 1);
  const ratio = count / effectiveTotal;
  if (ratio >= 1) return SELECTED_COLOR;
  const mix = 0.25 + ratio * 0.75;
  const r = Math.round(250 + (22 - 250) * mix);
  const g = Math.round(250 + (163 - 250) * mix);
  const b = Math.round(250 + (74 - 250) * mix);
  return `rgb(${r}, ${g}, ${b})`;
}

function indexToAnchor(index: number, slotsPerDay: number): PaintAnchor {
  return {
    dayIndex: Math.floor(index / slotsPerDay),
    slotInDay: index % slotsPerDay,
  };
}

function indicesInRectangle(
  anchor: PaintAnchor,
  end: PaintAnchor,
  slotsPerDay: number,
): number[] {
  const minDay = Math.min(anchor.dayIndex, end.dayIndex);
  const maxDay = Math.max(anchor.dayIndex, end.dayIndex);
  const minSlot = Math.min(anchor.slotInDay, end.slotInDay);
  const maxSlot = Math.max(anchor.slotInDay, end.slotInDay);
  const indices: number[] = [];

  for (let day = minDay; day <= maxDay; day++) {
    for (let slot = minSlot; slot <= maxSlot; slot++) {
      indices.push(slotIndex(day, slot, slotsPerDay));
    }
  }

  return indices;
}

function gridColumns(dayCount: number) {
  return `${TIME_COLUMN} repeat(${dayCount}, minmax(2.75rem, 1fr))`;
}

function cellColors(
  index: number,
  selected: boolean,
  draftSlots: boolean[],
  grid: SlotGridMeta,
  mode: "edit" | "group",
  count: number,
  participantCount: number,
  dayStartMinutes: number,
  slotMinutes: number,
) {
  const { dayIndex, slotInDay } = indexToAnchor(index, grid.slotsPerDay);
  const startMinutes = slotStartMinutes(dayStartMinutes, slotInDay, slotMinutes);
  const lineColor = rowBorderColor(startMinutes);
  const backgroundColor =
    mode === "group"
      ? heatColor(count, participantCount)
      : selected
        ? SELECTED_COLOR
        : EMPTY_COLOR;

  const aboveSelected =
    slotInDay > 0 &&
    draftSlots[slotIndex(dayIndex, slotInDay - 1, grid.slotsPerDay)];
  const topColor =
    mode === "edit" && selected && aboveSelected ? SELECTED_COLOR : lineColor;

  if (mode !== "edit" || !selected) {
    return {
      backgroundColor,
      borderTopColor: topColor,
      borderRightColor: DAY_LINE,
    };
  }

  const rightSelected =
    dayIndex + 1 < grid.days.length &&
    draftSlots[slotIndex(dayIndex + 1, slotInDay, grid.slotsPerDay)];
  const belowSelected =
    slotInDay + 1 < grid.slotsPerDay &&
    draftSlots[slotIndex(dayIndex, slotInDay + 1, grid.slotsPerDay)];
  const belowStart = slotStartMinutes(dayStartMinutes, slotInDay + 1, slotMinutes);
  const belowLine = belowSelected
    ? SELECTED_COLOR
    : slotInDay + 1 < grid.slotsPerDay
      ? rowBorderColor(belowStart)
      : lineColor;

  return {
    backgroundColor,
    borderTopColor: topColor,
    borderRightColor: rightSelected ? SELECTED_COLOR : DAY_LINE,
    borderBottomColor: belowLine,
  };
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
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const paintingRef = useRef(false);
  const paintValueRef = useRef(true);
  const paintAnchorRef = useRef<PaintAnchor | null>(null);
  const snapshotRef = useRef<boolean[]>([]);
  const lastPaintedRef = useRef<number | null>(null);
  const draftSlotsRef = useRef(draftSlots);

  const hasName = Boolean(activeParticipant?.name.trim());
  const canPaint = mode === "edit" && hasName;

  useEffect(() => {
    draftSlotsRef.current = draftSlots;
  }, [draftSlots]);

  useEffect(() => {
    setDraftSlots(
      normalizeSlots(activeParticipant?.slots ?? [], grid.totalSlots),
    );
  }, [activeParticipant, grid.totalSlots]);

  const { availabilityCounts, namesBySlot, contributorCount } = useMemo(() => {
    const counts = Array.from({ length: grid.totalSlots }, () => 0);
    const names = Array.from({ length: grid.totalSlots }, () => [] as string[]);
    const activeId = activeParticipant?.id;
    const activeName = activeParticipant?.name.trim() ?? "";

    for (const participant of event.participants) {
      if (activeId && participant.id === activeId) {
        draftSlots.forEach((available, index) => {
          if (available) {
            counts[index] += 1;
            names[index].push(activeName || participant.name);
          }
        });
        continue;
      }

      participant.slots.forEach((available, index) => {
        if (available) {
          counts[index] += 1;
          names[index].push(participant.name);
        }
      });
    }

    if (activeName && activeId === "draft") {
      draftSlots.forEach((available, index) => {
        if (available) {
          counts[index] += 1;
          names[index].push(activeName);
        }
      });
    }

    const draftContributing =
      activeName &&
      activeId === "draft" &&
      draftSlots.some(Boolean);
    const contributors = event.participants.length + (draftContributing ? 1 : 0);

    return {
      availabilityCounts: counts,
      namesBySlot: names,
      contributorCount: contributors,
    };
  }, [
    activeParticipant?.id,
    activeParticipant?.name,
    draftSlots,
    event.participants,
    grid.totalSlots,
  ]);

  const resolveIndexFromPoint = useCallback((clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    if (!target || !(target instanceof HTMLElement)) return null;
    const cell = target.closest("[data-slot-index]");
    if (!cell || !(cell instanceof HTMLElement)) return null;
    if (!gridRef.current?.contains(cell)) return null;

    const index = Number(cell.dataset.slotIndex);
    return Number.isNaN(index) ? null : index;
  }, []);

  const paintRectangle = useCallback(
    (endIndex: number) => {
      const anchor = paintAnchorRef.current;
      if (!anchor) return;
      if (lastPaintedRef.current === endIndex) return;
      lastPaintedRef.current = endIndex;

      const end = indexToAnchor(endIndex, grid.slotsPerDay);
      const indices = indicesInRectangle(anchor, end, grid.slotsPerDay);
      const next = snapshotRef.current.slice();

      for (const index of indices) {
        next[index] = paintValueRef.current;
      }

      setDraftSlots(next);
    },
    [grid.slotsPerDay],
  );

  const stopPainting = useCallback(() => {
    paintingRef.current = false;
    paintAnchorRef.current = null;
    lastPaintedRef.current = null;
  }, []);

  const beginPaint = useCallback(
    (index: number, pointerId: number) => {
      snapshotRef.current = draftSlotsRef.current.slice();
      paintAnchorRef.current = indexToAnchor(index, grid.slotsPerDay);
      paintValueRef.current = !draftSlotsRef.current[index];
      paintingRef.current = true;
      lastPaintedRef.current = null;
      paintRectangle(index);
      gridRef.current?.setPointerCapture(pointerId);
    },
    [grid.slotsPerDay, paintRectangle],
  );

  useEffect(() => {
    if (!canPaint) return;

    function onPointerMove(event: PointerEvent) {
      if (!paintingRef.current) return;
      event.preventDefault();
      const index = resolveIndexFromPoint(event.clientX, event.clientY);
      if (index !== null) paintRectangle(index);
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
  }, [canPaint, paintRectangle, resolveIndexFromPoint, stopPainting]);

  function startPainting(
    index: number,
    pointerEvent: ReactPointerEvent<HTMLElement>,
  ) {
    if (!canPaint) return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    beginPaint(index, pointerEvent.pointerId);
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
  const columnTemplate = gridColumns(grid.days.length);

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
            ? hasName
              ? `Drag to select · swipe beside the grid or date headers to scroll · ${selectedCount} slots`
              : "Enter your name above to mark your availability"
            : contributorCount > 0
              ? `Darker green = more overlap · ${contributorCount} response${contributorCount === 1 ? "" : "s"}`
              : "No responses yet — mark your times and save"}
        </p>
      </div>

      {mode === "group" ? (
        <p className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white">
          {tooltip ?? "Hover a slot to see who's available"}
        </p>
      ) : null}

      <div>
        <div
          ref={gridRef}
          className={`flex max-h-[min(70vh,32rem)] overflow-auto overscroll-contain sm:max-h-none ${
            canPaint ? "select-none" : ""
          }`}
        >
          <div className={`left-0 ${SCROLL_MARGIN_CLASS}`} aria-hidden />

          <div
            className={`relative min-w-max rounded-lg border border-zinc-200 bg-white ${
              !hasName && mode === "edit" ? "opacity-50" : ""
            }`}
          >
            {!hasName && mode === "edit" ? (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-lg bg-zinc-100/80 backdrop-blur-[1px]">
                <p className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm">
                  Enter your name
                </p>
              </div>
            ) : null}

            <div
              className="sticky top-0 z-20 grid border-b-2 border-zinc-300 bg-zinc-100/90 backdrop-blur"
              style={{ gridTemplateColumns: columnTemplate }}
            >
              <div className="sticky left-0 z-30 border-r border-zinc-300 bg-zinc-100 px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Time
              </div>
              {grid.days.map((day) => (
                <div
                  key={day.date}
                  className="touch-pan-x touch-pan-y border-r border-zinc-300 px-0.5 py-2 text-center text-[11px] font-medium leading-tight text-zinc-700 last:border-r-0 sm:text-xs"
                >
                  <div className="truncate">{day.shortLabel}</div>
                  <div className="hidden truncate text-[10px] font-normal text-zinc-500 sm:block">
                    {day.label}
                  </div>
                </div>
              ))}
            </div>

          {Array.from({ length: grid.slotsPerDay }, (_, slotInDay) => {
            const startMinutes = slotStartMinutes(
              event.dayStartMinutes,
              slotInDay,
              event.slotMinutes,
            );
            const timeLabel = grid.timeLabels[slotInDay];
            const lineColor = rowBorderColor(startMinutes);

            return (
            <div
              key={slotInDay}
              className="grid"
              style={{ gridTemplateColumns: columnTemplate }}
            >
              <div
                className="sticky left-0 z-10 flex h-7 items-center justify-end border-r border-zinc-300 bg-white px-1 text-[10px] tabular-nums whitespace-nowrap text-zinc-600 sm:h-8 sm:text-[11px]"
                style={{ borderTop: `1px solid ${lineColor}` }}
              >
                {timeLabel}
              </div>

              {grid.days.map((day, dayIndex) => {
                const index = slotIndex(dayIndex, slotInDay, grid.slotsPerDay);
                const selected = draftSlots[index];
                const count = availabilityCounts[index];
                const colors = cellColors(
                  index,
                  selected,
                  draftSlots,
                  grid,
                  mode,
                  count,
                  contributorCount,
                  event.dayStartMinutes,
                  event.slotMinutes,
                );

                return (
                  <div
                    key={`${day.date}-${slotInDay}`}
                    role="button"
                    tabIndex={canPaint ? 0 : -1}
                    data-slot-index={index}
                    aria-label={`${day.label} ${timeLabel || formatMinutes24(startMinutes)}`}
                    aria-pressed={canPaint ? selected : undefined}
                    aria-disabled={!canPaint && mode === "edit"}
                    onPointerDown={(pointerEvent) =>
                      startPainting(index, pointerEvent)
                    }
                    onPointerEnter={() => showTooltip(index)}
                    onPointerLeave={() => setTooltip(null)}
                    className={`h-7 border-r sm:h-8 ${
                      canPaint ? "cursor-cell touch-none" : "cursor-default"
                    } last:border-r-0`}
                    style={{
                      ...colors,
                      borderTopWidth: 1,
                      borderRightWidth: 1,
                      borderBottomWidth: colors.borderBottomColor ? 1 : 0,
                      borderStyle: "solid",
                    }}
                  />
                );
              })}
            </div>
            );
          })}
          </div>

          <div className={`right-0 ${SCROLL_MARGIN_CLASS}`} aria-hidden />
        </div>
      </div>

      {mode === "edit" && hasName ? (
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-zinc-200 bg-white/95 px-1 py-3 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
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
