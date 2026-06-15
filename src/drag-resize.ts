import { clampModalRect, type ModalRect } from "./geometry";

export type DragResizeMode = "drag" | "resize";

export interface DragResizeSessionOptions {
  isEnabled: () => boolean;
  handleEl: HTMLElement;
  modalEl: HTMLElement;
  mode: DragResizeMode;
  canStart?: (target: Element) => boolean;
  getCurrentRect: () => ModalRect;
  getHostBounds: () => {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onUpdate: (rect: ModalRect) => void;
  onCommit?: (rect: ModalRect) => void;
  onStateChange?: (active: boolean) => void;
}

export interface DragResizeSession {
  destroy(): void;
}

interface ActiveInteraction {
  pointerId: number;
  startX: number;
  startY: number;
  startRect: ModalRect;
}

export function createDragResizeSession(
  options: DragResizeSessionOptions,
): DragResizeSession {
  let active: ActiveInteraction | null = null;

  const onPointerDown = (event: PointerEvent): void => {
    if (!options.isEnabled() || event.button !== 0) {
      return;
    }

    const target = event.target;
    if (!(target instanceof options.modalEl.ownerDocument.defaultView!.Element)) {
      return;
    }

    if (options.canStart && !options.canStart(target)) {
      return;
    }
    if (options.mode === "resize" && !target.closest("[data-setmove-role='resize-handle']")) {
      return;
    }

    active = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: options.getCurrentRect(),
    };

    options.handleEl.setPointerCapture?.(event.pointerId);
    options.modalEl.classList.add("setmove--is-interacting");
    options.modalEl.classList.add(`setmove--is-${options.mode === "drag" ? "dragging" : "resizing"}`);
    options.modalEl.setCssStyles({ userSelect: "none" });
    options.onStateChange?.(true);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }

    const deltaX = event.clientX - active.startX;
    const deltaY = event.clientY - active.startY;
    const nextRect =
      options.mode === "drag"
        ? {
            ...active.startRect,
            x: active.startRect.x + deltaX,
            y: active.startRect.y + deltaY,
          }
        : {
            ...active.startRect,
            width: active.startRect.width + deltaX,
            height: active.startRect.height + deltaY,
          };

    const clamped = clampModalRect(nextRect, options.getHostBounds());
    options.onUpdate(clamped);
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }

    const deltaX = event.clientX - active.startX;
    const deltaY = event.clientY - active.startY;
    const nextRect =
      options.mode === "drag"
        ? {
            ...active.startRect,
            x: active.startRect.x + deltaX,
            y: active.startRect.y + deltaY,
          }
        : {
            ...active.startRect,
            width: active.startRect.width + deltaX,
            height: active.startRect.height + deltaY,
          };

    const clamped = clampModalRect(nextRect, options.getHostBounds());
    options.onUpdate(clamped);
    options.onCommit?.(clamped);
    finishInteraction(event.pointerId);
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (!active || event.pointerId !== active.pointerId) {
      return;
    }

    options.onUpdate(active.startRect);
    finishInteraction(event.pointerId);
  };

  const finishInteraction = (pointerId: number): void => {
    options.handleEl.releasePointerCapture?.(pointerId);
    options.modalEl.classList.remove("setmove--is-interacting");
    options.modalEl.classList.remove("setmove--is-dragging", "setmove--is-resizing");
    options.modalEl.setCssStyles({ userSelect: "" });
    options.onStateChange?.(false);
    active = null;
  };

  options.handleEl.addEventListener("pointerdown", onPointerDown);
  options.handleEl.addEventListener("pointermove", onPointerMove);
  options.handleEl.addEventListener("pointerup", onPointerUp);
  options.handleEl.addEventListener("pointercancel", onPointerCancel);

  return {
    destroy(): void {
      if (active) {
        finishInteraction(active.pointerId);
      }

      options.handleEl.removeEventListener("pointerdown", onPointerDown);
      options.handleEl.removeEventListener("pointermove", onPointerMove);
      options.handleEl.removeEventListener("pointerup", onPointerUp);
      options.handleEl.removeEventListener("pointercancel", onPointerCancel);
    },
  };
}
