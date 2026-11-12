import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable table cell widget providing drag-and-drop grip handle,
 * inline-editable #order pill, and Move to Top / Move Up / Move Down buttons
 * for CMS Web Pages, Layout Sections, and Repeating Sub-Items.
 */
@Component({
  selector: 'app-cms-order-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tag-order-cell">
      <span
        class="drag-grip-handle"
        [attr.title]="'Drag up or down to re-order ' + entityLabel"
      >
        <span class="material-symbols-outlined">drag_indicator</span>
      </span>

      <span
        class="order-pill"
        *ngIf="!editing"
        (click)="startEdit()"
        title="Click to edit custom sort order"
      >
        #{{ order }}
      </span>

      <input
        *ngIf="editing"
        #orderInput
        type="number"
        class="order-input-mini"
        [value]="order"
        (blur)="commitEdit(orderInput.value)"
        (keydown.enter)="commitEdit(orderInput.value)"
        (keydown.escape)="cancelEdit()"
        (click)="$event.stopPropagation()"
      />

      <div class="arrow-sort-group">
        <button
          type="button"
          class="btn-sort-arrow"
          (click)="$event.stopPropagation(); moveToTop.emit()"
          [disabled]="disabled || isFirst"
          [attr.title]="'Move ' + entityLabel + ' directly to top'"
        >
          <span class="material-symbols-outlined">vertical_align_top</span>
        </button>
        <button
          type="button"
          class="btn-sort-arrow"
          (click)="$event.stopPropagation(); moveUp.emit()"
          [disabled]="disabled || isFirst"
          [attr.title]="'Move ' + entityLabel + ' up'"
        >
          <span class="material-symbols-outlined">expand_less</span>
        </button>
        <button
          type="button"
          class="btn-sort-arrow"
          (click)="$event.stopPropagation(); moveDown.emit()"
          [disabled]="disabled || isLast"
          [attr.title]="'Move ' + entityLabel + ' down'"
        >
          <span class="material-symbols-outlined">expand_more</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tag-order-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .drag-grip-handle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      color: #94a3b8;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }
    .drag-grip-handle:hover {
      color: #0050e5;
      background: #eff6ff;
    }
    .drag-grip-handle:active {
      cursor: grabbing;
    }
    .drag-grip-handle .material-symbols-outlined {
      font-size: 18px;
    }
    .order-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      padding: 2px 7px;
      background: #f1f5f9;
      color: #1e293b;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      transition: all 0.15s ease;
    }
    .order-pill:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #0050e5;
    }
    .order-input-mini {
      width: 52px;
      height: 24px;
      padding: 0 4px;
      font-size: 11px;
      font-weight: 700;
      border: 1.5px solid #0050e5;
      border-radius: 5px;
      outline: none;
      background: #ffffff;
      color: #0f172a;
      text-align: center;
    }
    .arrow-sort-group {
      display: inline-flex;
      flex-direction: column;
      gap: 1px;
    }
    .btn-sort-arrow {
      background: transparent;
      border: none;
      padding: 0;
      line-height: 1;
      height: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .btn-sort-arrow .material-symbols-outlined {
      font-size: 15px;
    }
    .btn-sort-arrow:hover:not(:disabled) {
      color: #0050e5;
      transform: scale(1.15);
    }
    .btn-sort-arrow:disabled {
      opacity: 0.25;
      cursor: default;
    }
  `]
})
export class CmsOrderCellComponent {
  /** Current integer sort order displayed on the pill. */
  @Input() order: number = 0;

  /** Disables Top and Up buttons when true. */
  @Input() isFirst: boolean = false;

  /** Disables Down button when true. */
  @Input() isLast: boolean = false;

  /** Disables arrow buttons while a save request is in flight. */
  @Input() disabled: boolean = false;

  /** Entity noun used in hover tooltip titles. */
  @Input() entityLabel: string = 'item';

  /** Emitted when user clicks Move to Top. */
  @Output() moveToTop = new EventEmitter<void>();

  /** Emitted when user clicks Move Up. */
  @Output() moveUp = new EventEmitter<void>();

  /** Emitted when user clicks Move Down. */
  @Output() moveDown = new EventEmitter<void>();

  /** Emitted when inline number edit finishes with a valid changed integer. */
  @Output() orderCommit = new EventEmitter<number>();

  @ViewChild('orderInput') orderInputRef?: ElementRef<HTMLInputElement>;

  editing: boolean = false;

  /**
   * Switches the order pill into inline numeric edit mode and focuses the input.
   */
  startEdit(): void {
    this.editing = true;
    setTimeout(() => {
      const el = this.orderInputRef?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }

  /**
   * Cancels inline order editing without emitting changes.
   */
  cancelEdit(): void {
    this.editing = false;
  }

  /**
   * Commits the typed sort order if it is a valid integer different from the current value.
   * @param rawValue Text input string submitted by blur or Enter key.
   */
  commitEdit(rawValue: string): void {
    if (!this.editing) return;
    this.editing = false;
    const parsed = parseInt(rawValue, 10);
    if (!isNaN(parsed) && parsed !== this.order) {
      this.orderCommit.emit(parsed);
    }
  }
}

/**
 * Shared HTML5 drag-and-drop state tracker and pure array reordering helpers
 * for CMS tables so drag/move/respace logic is never duplicated.
 */
export class CmsDragDropReorderHelper {
  /** Index of the row currently being dragged, or null when idle. */
  draggedIndex: number | null = null;

  /** Index of the row currently hovered as a drop target, or null when idle. */
  dragOverIndex: number | null = null;

  /**
   * Records drag origin index and configures HTML5 drag dataTransfer payload.
   * @param event Native DragEvent fired on dragstart.
   * @param index Index of the dragged row.
   */
  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  /**
   * Enables drop and highlights the hovered destination row.
   * @param event Native DragEvent fired on dragover.
   * @param index Index of the hovered row.
   */
  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverIndex = index;
  }

  /**
   * Clears drop highlight when pointer leaves the hovered row.
   * @param index Index of the row being left.
   */
  onDragLeave(index: number): void {
    if (this.dragOverIndex === index) {
      this.dragOverIndex = null;
    }
  }

  /**
   * Finalizes drop coordinates and resets drag state.
   * @param event Native DragEvent fired on drop.
   * @param targetIndex Index of the row receiving the drop.
   * @returns Source and destination indices if a move occurred, otherwise null.
   */
  consumeDrop(event: DragEvent, targetIndex: number): { fromIndex: number; toIndex: number } | null {
    event.preventDefault();
    this.dragOverIndex = null;
    const fromIndex = this.draggedIndex;
    this.draggedIndex = null;

    if (fromIndex === null || fromIndex === targetIndex) {
      return null;
    }
    return { fromIndex, toIndex: targetIndex };
  }

  /**
   * Resets drag visual indicators (e.g. if drag cancels outside the table).
   */
  reset(): void {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }
}

/**
 * Returns a new array with the item at <paramref name="fromIndex"/> moved to <paramref name="toIndex"/>.
 */
export function reorderListByMove<T>(items: T[], fromIndex: number, toIndex: number): T[] | null {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return null;
  }
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

/**
 * Returns a new array with the item at <paramref name="index"/> moved directly to position 0.
 */
export function reorderListToTop<T>(items: T[], index: number): T[] | null {
  return reorderListByMove(items, index, 0);
}

/**
 * Returns a new array swapping the item at <paramref name="index"/> one slot up (-1) or down (+1).
 */
export function reorderListStep<T>(items: T[], index: number, delta: -1 | 1): T[] | null {
  return reorderListByMove(items, index, index + delta);
}

/**
 * Assigns spaced numeric sort orders (10, 20, 30, ...) on each item in orderedItems
 * and produces the batch reorder API payload.
 */
export function assignStepOrders(
  orderedItems: Array<Record<string, any>>,
  orderField: string,
  step: number = 10
): Array<{ id: string; sortOrder: number }> {
  return orderedItems.map((item, idx) => {
    const newOrder = (idx + 1) * step;
    item[orderField] = newOrder;
    return { id: item['id'], sortOrder: newOrder };
  });
}

