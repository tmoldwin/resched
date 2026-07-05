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
const SCROLL_MARGIN_CLASS = "w-16 shrink-0 self-stretch touch-pan-y sm:w-8";
const THUMB_TOOLTIP_OFFSET = 72;

type TooltipState = {
  headline: string;
  detail: string;
  x: number;
  y: number;
  placement: "above" | "follow";
};

function heatColor(count: number, total: number) {
  if (count <= 0) return EMPTY_COLOR;
  const effectiveTotal = Math.max(total, 1);
  const ratio = count / effectiveTotal;
  if (ratio >= 1) return SELECTED_COLOR;
  const mix = 0.12 + ratio * 0.88;
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
  return `${TIME_COLUMN} repeat(${dayCount}, minmax(0, 1fr))`;
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
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [groupFocusIndex, setGroupFocusIndex] = useState<number | null>(null);
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
    setTooltip(null);
    setGroupFocusIndex(null);
  }, [mode]);

  useEffect(() => {
    if (mode !== "group" || groupFocusIndex === null) return;

    function onPointerDown(event: PointerEvent) {
      const cell = (event.target as HTMLElement | null)?.closest(
        "[data-slot-index]",
      );
      if (cell instanceof HTMLElement && gridRef.current?.contains(cell)) {
        return;
      }
      setGroupFocusIndex(null);
      setTooltip(null);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [groupFocusIndex, mode]);

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

  function slotTooltipDetail(index: number) {
    const names = namesBySlot[index];
    return names.length > 0
      ? `${names.length} available: ${names.join(", ")}`
      : "Nobody available";
  }

  function slotTooltipHeadline(index: number) {
    const { dayIndex, slotInDay } = indexToAnchor(index, grid.slotsPerDay);
    const day = grid.days[dayIndex];
    const startMinutes = slotStartMinutes(
      event.dayStartMinutes,
      slotInDay,
      event.slotMinutes,
    );
    const time =
      grid.timeLabels[slotInDay] || formatMinutes24(startMinutes);
    return `${day.label} · ${time}`;
  }

  function showSlotTooltip(
    index: number,
    clientX: number,
    clientY: number,
    placement: TooltipState["placement"] = "follow",
  ) {
    if (mode !== "group") return;
    setTooltip({
      headline: slotTooltipHeadline(index),
      detail: slotTooltipDetail(index),
      x: clientX,
      y: clientY,
      placement,
    });
  }

  function hideSlotTooltip() {
    if (mode !== "group") return;
    setTooltip(null);
    setGroupFocusIndex(null);
  }

  function inspectGroupSlot(
    index: number,
    pointerEvent: ReactPointerEvent<HTMLElement>,
  ) {
    if (mode !== "group") return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    setGroupFocusIndex(index);

    if (pointerEvent.pointerType === "touch") {
      showSlotTooltip(
        index,
        pointerEvent.clientX,
        pointerEvent.clientY,
        "above",
      );
      return;
    }

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    showSlotTooltip(
      index,
      rect.left + rect.width / 2,
      rect.top,
      "above",
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
              ? `Drag to select · swipe side margins to scroll · ${selectedCount} slots`
              : "Enter your name above to mark your availability"
            : contributorCount > 0
              ? `Darker green = more overlap · ${contributorCount} response${contributorCount === 1 ? "" : "s"}`
              : "No responses yet — mark your times and save"}
        </p>
      </div>

      <div
        className={`-mx-4 flex w-full items-stretch sm:mx-0 ${canPaint ? "select-none" : ""}`}
      >
        <div className={SCROLL_MARGIN_CLASS} aria-hidden />

        <div
          ref={gridRef}
          className={`relative min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white ${
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
            className="sticky top-0 z-20 grid w-full border-b-2 border-zinc-300 bg-zinc-100/90 backdrop-blur"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            <div className="border-r border-zinc-300 bg-zinc-100 px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Time
            </div>
            {grid.days.map((day) => (
              <div
                key={day.date}
                className="border-r border-zinc-300 px-0.5 py-1.5 text-center leading-tight text-zinc-700 last:border-r-0"
              >
                <div className="text-xs font-semibold tabular-nums sm:text-sm">
                  {day.dayNumber}
                </div>
                <div className="text-[10px] font-normal text-zinc-500 sm:text-[11px]">
                  {day.weekdayShort}
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
              className="grid w-full"
              style={{ gridTemplateColumns: columnTemplate }}
            >
              <div
                className="flex h-7 items-center justify-end border-r border-zinc-300 bg-white px-1 text-[10px] tabular-nums whitespace-nowrap text-zinc-600 sm:h-8 sm:text-[11px]"
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

                const slotNames = namesBySlot[index];
                const isGroupFocused =
                  mode === "group" && groupFocusIndex === index;

                return (
                  <div
                    key={`${day.date}-${slotInDay}`}
                    role={mode === "group" ? undefined : "button"}
                    tabIndex={canPaint ? 0 : mode === "group" ? 0 : -1}
                    data-slot-index={index}
                    aria-label={`${day.label} ${timeLabel || formatMinutes24(startMinutes)}${
                      mode === "group" && slotNames.length > 0
                        ? ` · ${slotNames.join(", ")}`
                        : ""
                    }`}
                    aria-pressed={canPaint ? selected : undefined}
                    aria-disabled={!canPaint && mode === "edit"}
                    onPointerDown={(pointerEvent) => {
                      if (mode === "group") {
                        inspectGroupSlot(index, pointerEvent);
                        return;
                      }
                      startPainting(index, pointerEvent);
                    }}
                    onMouseEnter={(mouseEvent) => {
                      if (mode !== "group") return;
                      setGroupFocusIndex(index);
                      showSlotTooltip(
                        index,
                        mouseEvent.clientX,
                        mouseEvent.clientY,
                        "follow",
                      );
                    }}
                    onMouseMove={(mouseEvent) => {
                      if (mode !== "group") return;
                      showSlotTooltip(
                        index,
                        mouseEvent.clientX,
                        mouseEvent.clientY,
                        "follow",
                      );
                    }}
                    onMouseLeave={() => {
                      if (mode !== "group") return;
                      hideSlotTooltip();
                    }}
                    onFocus={(focusEvent) => {
                      if (mode !== "group") return;
                      setGroupFocusIndex(index);
                      const rect = focusEvent.currentTarget.getBoundingClientRect();
                      showSlotTooltip(
                        index,
                        rect.left + rect.width / 2,
                        rect.top,
                        "above",
                      );
                    }}
                    onBlur={() => {
                      if (mode !== "group") return;
                      hideSlotTooltip();
                    }}
                    className={`h-7 border-r sm:h-8 ${
                      canPaint
                        ? "cursor-cell touch-none"
                        : mode === "group"
                          ? "cursor-pointer touch-manipulation"
                          : "cursor-default"
                    } last:border-r-0`}
                    style={{
                      ...colors,
                      borderTopWidth: 1,
                      borderRightWidth: 1,
                      borderBottomWidth: colors.borderBottomColor ? 1 : 0,
                      borderStyle: "solid",
                      WebkitTapHighlightColor: "transparent",
                      ...(isGroupFocused
                        ? {
                            boxShadow: "inset 0 0 0 2px #15803d",
                            zIndex: 1,
                            position: "relative" as const,
                          }
                        : {}),
                    }}
                  />
                );
              })}
            </div>
            );
          })}
        </div>

        <div className={SCROLL_MARGIN_CLASS} aria-hidden />
      </div>

      {tooltip && mode === "group" ? (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform:
              tooltip.placement === "above"
                ? `translate(-50%, calc(-100% - ${THUMB_TOOLTIP_OFFSET}px))`
                : "translate(12px, 12px)",
          }}
          role="tooltip"
        >
          <div className="font-medium">{tooltip.headline}</div>
          <div className="mt-0.5 text-zinc-300">{tooltip.detail}</div>
        </div>
      ) : null}

      {mode === "edit" && hasName ? (
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
