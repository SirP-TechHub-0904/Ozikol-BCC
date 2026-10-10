import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { ApiService } from '../../../../../core/services/api.service';
import { ToastService } from '../../../../../core/services/toast.service';
import type { ICategoryAiRule } from './ai-rules/category-ai-rule.interface';
import { getCategoryAiRule } from './ai-rules/ai-rules-registry';

/**
 * Options for triggering category-aware AI token transformation.
 */
export interface CategoryTransformRequest {
  /** Target category string (e.g. 'menu', 'hero', 'breadcrumb', 'cards', 'footer', 'blog', 'blog_detail') */
  category: string;
  /** Live HTML code from editor */
  rawHtml: string;
  /** Live CSS code for styling context */
  rawCss?: string;
  /** Active preset variant or template name */
  templateName?: string;
}

/**
 * Result returned by the unified AI template transformation service.
 */
export interface CategoryTransformResult {
  /** Clean transformed HTML with preserved styles and Handlebars tokens */
  transformedHtml: string;
  /** Category strategy that processed the request */
  rule: ICategoryAiRule;
}

/**
 * Unified Frontend Service for CMS Template AI Transformations.
 * 
 * Orchestrates category-specific rules via the Strategy Pattern (AiRulesRegistry)
 * while dispatching requests to a single backend endpoint (ContentApi/templates/ai-copilot).
 */
@Injectable({
  providedIn: 'root'
})
export class TemplateAiService {
  private readonly _isTransformingSubject = new BehaviorSubject<boolean>(false);
  public readonly isTransforming$: Observable<boolean> = this._isTransformingSubject.asObservable();

  constructor(
    private readonly api: ApiService,
    private readonly toast: ToastService
  ) {}

  /**
   * Transforms raw HTML into canonical Ozikol Handlebars tokens using the
   * category-specific prompt strategy while routing to the unified AI copilot engine.
   *
   * @param request Input options including category, raw HTML, and CSS
   * @returns Observable emitting the cleaned transformed HTML string
   */
  transformCategoryPlaceholders(request: CategoryTransformRequest): Observable<string> {
    const rawHtml = (request.rawHtml || '').trim();
    if (!rawHtml) {
      this.toast.warning('Please enter HTML markup first.');
      return throwError(() => new Error('HTML markup is empty.'));
    }

    // 1. Resolve category-specific rule strategy
    const rule = getCategoryAiRule(request.category);

    // 2. Build category-tailored surgical prompt
    const prompt = rule.buildSurgicalPrompt({
      rawHtml,
      rawCss: request.rawCss,
      templateName: request.templateName
    });

    // 3. Assemble unified payload
    const payload = {
      prompt,
      rawHtml,
      rawCss: request.rawCss || '',
      category: rule.categoryKey,
      currentTemplateName: request.templateName || rule.displayName
    };

    this._isTransformingSubject.next(true);

    return this.api.post<any>('ContentApi/templates/ai-copilot', payload).pipe(
      map(res => {
        let transformed = res?.data?.htmlTemplate || res?.data?.codeResult?.htmlTemplate || res?.htmlTemplate || '';
        if (typeof transformed === 'object' && transformed?.htmlTemplate) {
          transformed = transformed.htmlTemplate;
        }

        if (typeof transformed === 'string' && transformed.trim()) {
          // Strip any markdown code block wrapper if returned by LLM
          transformed = transformed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
          return transformed;
        }

        throw new Error('AI response did not return transformed HTML.');
      }),
      catchError(err => {
        const errorMsg = err?.error?.message || err?.message || 'Failed to transform template placeholders.';
        return throwError(() => new Error(errorMsg));
      }),
      finalize(() => {
        this._isTransformingSubject.next(false);
      })
    );
  }

  /**
   * Helper to retrieve rule strategy metadata for a category.
   *
   * @param category Category identifier
   * @returns The registered category rule strategy
   */
  getCategoryRule(category: string): ICategoryAiRule {
    return getCategoryAiRule(category);
  }
}
