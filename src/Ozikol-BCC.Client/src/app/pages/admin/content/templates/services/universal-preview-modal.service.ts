import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CodeInjectionTag } from './html-assembler.service';

/**
 * Universal payload structure required to preview any CMS section template.
 */
export interface TemplatePreviewPayload {
  /** Display title for the template (e.g. "Modern Breadcrumb Page Banner") */
  title: string;
  /** Template category ('breadcrumb' | 'menu' | 'hero' | 'footer' | 'body' | 'blog' | 'blog_detail') */
  category: string;
  /** Unique variant code / key (e.g. "BCRUMB_3B0QP") */
  variantCode?: string;
  /** Semantic version string */
  version?: string;
  /** Optional badge or suite label */
  badge?: string;
  /** Raw HTML template containing tokens */
  htmlTemplate: string;
  /** Scoped CSS styles */
  cssStyles?: string;
  /** Optional JavaScript executable script */
  jsScript?: string;
  /** Optional category-specific sample data payload */
  sampleContent?: any;
  /** Optional route URL to jump directly to the Visual Studio editor for this component */
  editUrl?: string;
  /** Target theme suite identifier (e.g. "suite_corporate") */
  suiteCode?: string;
  /** Active code injection tags (head, body-open, footer) to link inside preview iframe */
  codeInjections?: CodeInjectionTag[];
}

/**
 * Centralized singleton service governing interactive simulated previews across
 * all CMS template catalogs, index cards, and category visual studios.
 * Guarantees 1-to-1 visual rendering parity everywhere.
 */
@Injectable({
  providedIn: 'root'
})
export class UniversalPreviewModalService {
  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  private readonly _payload$ = new BehaviorSubject<TemplatePreviewPayload | null>(null);

  /** Observable stream indicating modal visibility state */
  readonly isOpen$: Observable<boolean> = this._isOpen$.asObservable();

  /** Observable stream of active template preview parameters */
  readonly payload$: Observable<TemplatePreviewPayload | null> = this._payload$.asObservable();

  /**
   * Opens the universal preview modal with the provided template payload.
   * @param payload Complete template configuration and preview options.
   */
  open(payload: TemplatePreviewPayload): void {
    if (!payload) return;
    this._payload$.next(payload);
    this._isOpen$.next(true);
  }

  /**
   * Closes the active universal preview modal and clears parameters.
   */
  close(): void {
    this._isOpen$.next(false);
    this._payload$.next(null);
  }

  /** Current synchronous open state */
  get isOpen(): boolean {
    return this._isOpen$.getValue();
  }

  /** Current synchronous payload */
  get currentPayload(): TemplatePreviewPayload | null {
    return this._payload$.getValue();
  }
}
