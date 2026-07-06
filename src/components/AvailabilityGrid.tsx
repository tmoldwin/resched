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
  onPasswordRejected?: () => void;
  initialMode?: "edit" | "group";
};

type PaintAnchor = {
  dayIndex: number;
  slotInDay: number;
};

const SELECTED_COLOR = "#16a34a";
const EMPTY_COLOR = "#fafafa";
const DAY_LINE = "#d4d4d8";
const TIME_COLUMN = "3rem";
const SCROLL_MARGIN_CLASS = "w-10 shrink-0 self-stretch touch-pan-y sm:w-6";
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
  _draftSlots: boolean[],
  grid: SlotGridMeta,
  mode: "edit" | "group",
  count: number,
  participantCount: number,
  dayStartMinutes: number,
  slotMinutes: number,
) {
  const { slotInDay } = indexToAnchor(index, grid.slotsPerDay);
  const startMinutes = slotStartMinutes(dayStartMinutes, slotInDay, slotMinutes);
  const lineColor = rowBorderColor(startMinutes);
  const backgroundColor =
    mode === "group"
      ? heatColor(count, participantCount)
      : selected
        ? SELECTED_COLOR
        : EMPTY_COLOR;

  return {
    backgroundColor,
    borderTopColor: lineColor,
    borderRightColor: DAY_LINE,
  };
}

export default function AvailabilityGrid({
  event,
  activeParticipant,
  editToken,
  password,
  onSaved,
  onPasswordRejected,
  initialMode = "edit",
}: AvailabilityGridProps) {
  const grid = useMemo(
    () =>
      buildSlotGrid(
        event.startDate,
        event.endDate,
        event.dayStartMinutes,
        event.dayEndMinutes,
        event.slotMinutes,
        event.dates,
      ),
    [event],
  );

  const [mode, setMode] = useState<"edit" | "group">(initialMode);
  const [draftSlots, setDraftSlots] = useState<boolean[]>(() =>
    normalizeSlots(activeParticipant?.slots ?? [], grid.totalSlots),
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [groupFocusIndex, setGroupFocusIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState<"success" | "error" | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const paintingRef = useRef(false);
  const paintValueRef = useRef(true);
  const paintAnchorRef = useRef<PaintAnchor | null>(null);
  const snapshotRef = useRef<boolean[]>([]);
  const lastPaintedRef = useRef<number | null>(null);
  const draftSlotsRef = useRef(draftSlots);
  const touchInteractionRef = useRef(false);
  const lastSyncedSlotsRef = useRef<string | null>(null);
  const pendingPaintRef = useRef<{
    index: number;
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    activated: boolean;
  } | null>(null);
  const hasUnsavedEditsRef = useRef(false);

  const PAINT_THRESHOLD_PX = 10;
  const TOUCH_PAINT_THRESHOLD_PX = 24;

  const canPaint = mode === "edit";

  useEffect(() => {
    setTooltip(null);
    setGroupFocusIndex(null);
    if (mode === "edit") {
      setSaveNotice(null);
    }
  }, [mode]);

  useEffect(() => {
    if (saveNotice !== "success") return;
    const timer = window.setTimeout(() => setSaveNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

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

    window.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      window.removeEventListener("pointerdown", onPointerDown, true);
  }, [groupFocusIndex, mode]);

  const commitDraftSlots = useCallback((next: boolean[]) => {
    draftSlotsRef.current = next;
    hasUnsavedEditsRef.current = true;
    setDraftSlots(next);
  }, []);

  const participantId = activeParticipant?.id ?? "none";
  const participantSlots = activeParticipant?.slots;

  useEffect(() => {
    if (hasUnsavedEditsRef.current && participantId === "draft") {
      return;
    }

    const slots = participantSlots ?? [];
    const slotsKey = JSON.stringify(slots);
    const syncKey = `${participantId}:${grid.totalSlots}:${slotsKey}`;

    if (lastSyncedSlotsRef.current === syncKey) {
      return;
    }

    lastSyncedSlotsRef.current = syncKey;
    const normalized = normalizeSlots(slots, grid.totalSlots);
    draftSlotsRef.current = normalized;
    setDraftSlots(normalized);
  }, [participantId, participantSlots, grid.totalSlots]);

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

      commitDraftSlots(next);
    },
    [commitDraftSlots, grid.slotsPerDay],
  );

  const stopPainting = useCallback(() => {
    paintingRef.current = false;
    paintAnchorRef.current = null;
    lastPaintedRef.current = null;
    pendingPaintRef.current = null;
  }, []);

  const activateStroke = useCallback(
    (index: number) => {
      const pending = pendingPaintRef.current;
      if (!pending || pending.activated) return;

      pending.activated = true;
      paintAnchorRef.current = indexToAnchor(pending.index, grid.slotsPerDay);
      paintValueRef.current =
        pending.pointerType === "touch"
          ? true
          : !snapshotRef.current[pending.index];
      paintingRef.current = true;
      lastPaintedRef.current = null;
      paintRectangle(index);
    },
    [grid.slotsPerDay, paintRectangle],
  );

  const beginPaint = useCallback(
    (
      index: number,
      pointerId: number,
      pointerType: string,
      clientX: number,
      clientY: number,
    ) => {
      snapshotRef.current = draftSlotsRef.current.slice();
      pendingPaintRef.current = {
        index,
        pointerId,
        pointerType,
        startX: clientX,
        startY: clientY,
        activated: false,
      };
      gridRef.current?.setPointerCapture(pointerId);
    },
    [],
  );

  useEffect(() => {
    if (!canPaint) return;

    function onPointerMove(event: PointerEvent) {
      const pending = pendingPaintRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;

      if (!pending.activated) {
        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        const threshold =
          pending.pointerType === "touch"
            ? TOUCH_PAINT_THRESHOLD_PX
            : PAINT_THRESHOLD_PX;
        if (dx * dx + dy * dy < threshold * threshold) {
          return;
        }

        const index = resolveIndexFromPoint(event.clientX, event.clientY);
        activateStroke(index ?? pending.index);
        return;
      }

      if (!paintingRef.current) return;
      event.preventDefault();
      const index = resolveIndexFromPoint(event.clientX, event.clientY);
      if (index !== null) paintRectangle(index);
    }

    function onPointerEnd(event: PointerEvent) {
      const pending = pendingPaintRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;

      if (!pending.activated) {
        const next = draftSlotsRef.current.slice();
        next[pending.index] = !next[pending.index];
        commitDraftSlots(next);
      }

      if (gridRef.current?.hasPointerCapture(event.pointerId)) {
        gridRef.current.releasePointerCapture(event.pointerId);
      }

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
  }, [
    activateStroke,
    canPaint,
    commitDraftSlots,
    paintRectangle,
    resolveIndexFromPoint,
    stopPainting,
  ]);

  function startPainting(
    index: number,
    pointerEvent: ReactPointerEvent<HTMLElement>,
  ) {
    if (!canPaint) return;

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    beginPaint(
      index,
      pointerEvent.pointerId,
      pointerEvent.pointerType,
      pointerEvent.clientX,
      pointerEvent.clientY,
    );
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

    if (pointerEvent.pointerType === "touch") {
      touchInteractionRef.current = true;
      window.setTimeout(() => {
        touchInteractionRef.current = false;
      }, 700);
    }

    pointerEvent.stopPropagation();

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    setGroupFocusIndex(index);
    showSlotTooltip(
      index,
      rect.left + rect.width / 2,
      rect.top,
      "above",
    );
  }

  async function saveAvailability() {
    if (!activeParticipant?.name.trim()) {
      setSaveNotice("error");
      setSaveMessage("Enter your name before saving.");
      return;
    }

    setSaving(true);
    setSaveMessage("");
    setSaveNotice(null);

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

      if (response.status === 401) {
        onPasswordRejected?.();
        throw new Error(data.error || "Invalid password.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not save availability.");
      }

      hasUnsavedEditsRef.current = false;
      draftSlotsRef.current = data.slots;
      setDraftSlots(data.slots);
      lastSyncedSlotsRef.current = `${data.id}:${grid.totalSlots}:${JSON.stringify(data.slots)}`;
      setMode("group");
      setSaveNotice("success");
      setSaveMessage("");
      onSaved?.({
        id: data.id,
        name: data.name,
        editToken: data.editToken,
        slots: data.slots,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setSaveNotice("error");
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
    <section className="space-y-4 border-t border-zinc-200 pt-6">
      {saveNotice === "success" && mode === "group" ? (
        <p className="notice-success" role="status">
          Availability saved. You&apos;re now viewing all responses.
        </p>
      ) : null}

      <div className="segmented">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`segmented-item ${
            mode === "edit" ? "segmented-item-active" : "segmented-item-inactive"
          }`}
        >
          Edit responses
        </button>
        <button
          type="button"
          onClick={() => setMode("group")}
          className={`segmented-item ${
            mode === "group" ? "segmented-item-active" : "segmented-item-inactive"
          }`}
        >
          View responses
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        {mode === "edit"
          ? `Drag to select times · swipe side margins to scroll · ${selectedCount} slots selected`
          : contributorCount > 0
            ? `Darker green = more overlap · ${contributorCount} response${contributorCount === 1 ? "" : "s"} · tap a slot for details`
            : "No responses yet — mark your times and save"}
      </p>

      <div
        className={`flex w-full items-stretch ${canPaint ? "select-none" : ""}`}
      >
        <div className={SCROLL_MARGIN_CLASS} aria-hidden />

        <div
          ref={gridRef}
          className="relative min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white"
        >
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
                    tabIndex={canPaint ? 0 : -1}
                    data-slot-index={index}
                    aria-label={`${day.label} ${timeLabel || formatMinutes24(startMinutes)}${
                      mode === "group" && slotNames.length > 0
                        ? ` · ${slotNames.join(", ")}`
                        : ""
                    }`}
                    aria-pressed={canPaint ? selected : undefined}
                    onPointerDown={(pointerEvent) => {
                      if (mode === "group") {
                        inspectGroupSlot(index, pointerEvent);
                        return;
                      }
                      startPainting(index, pointerEvent);
                    }}
                    onMouseEnter={(mouseEvent) => {
                      if (mode !== "group" || touchInteractionRef.current) {
                        return;
                      }
                      setGroupFocusIndex(index);
                      showSlotTooltip(
                        index,
                        mouseEvent.clientX,
                        mouseEvent.clientY,
                        "follow",
                      );
                    }}
                    onMouseMove={(mouseEvent) => {
                      if (mode !== "group" || touchInteractionRef.current) {
                        return;
                      }
                      showSlotTooltip(
                        index,
                        mouseEvent.clientX,
                        mouseEvent.clientY,
                        "follow",
                      );
                    }}
                    onMouseLeave={() => {
                      if (mode !== "group" || touchInteractionRef.current) {
                        return;
                      }
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
                      borderBottomWidth: 0,
                      borderStyle: "solid",
                      WebkitTapHighlightColor: "transparent",
                      ...(isGroupFocused
                        ? { boxShadow: "inset 0 0 0 2px #15803d" }
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

      {mode === "edit" ? (
        <div className="form-footer">
          {saveNotice === "error" && saveMessage ? (
            <p className="notice-error sm:mr-auto sm:flex-1" role="alert">
              {saveMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving…" : "Save availability"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
