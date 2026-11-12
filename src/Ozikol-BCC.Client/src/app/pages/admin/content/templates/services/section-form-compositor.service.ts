import { Injectable } from '@angular/core';

/**
 * Result produced after composing an attached Dynamic Form around an already-hydrated section block.
 */
export interface ComposedSectionOutput {
  html: string;
  css: string;
}

/**
 * Standalone post-hydration compositor for CMS sections that have a Dynamic Page Form attached
 * (`pageFormId` / `formKey` / `pageForm`) when the chosen section template contains no `{{ Form }}` slot.
 *
 * Strictly non-invasive: existing templates and hydrators remain untouched, and if hydrated HTML
 * already contains a `<form` or `data-form-key=` attribute, composition is skipped so forms never duplicate.
 */
@Injectable({
  providedIn: 'root'
})
export class SectionFormCompositorService {

  /**
   * Composes a section's attached PageForm alongside or around its hydrated HTML according to
   * `formWidthPreset`, `formCustomWidthPercent`, `formPlacementMode`, and `hideSectionImageWhenFormActive`.
   * @param hydratedHtml Already-hydrated section HTML output from ContentHydrationService.
   * @param sec Database PageSection record (with optional populated `pageForm.fields`).
   * @returns Final HTML markup and additional scoped wrapper CSS.
   */
  compose(hydratedHtml: string, sec: any): ComposedSectionOutput {
    if (!hydratedHtml || !sec) {
      return { html: hydratedHtml || '', css: '' };
    }

    const rawFormKey = (sec.formKey || sec.pageForm?.formKey || '').trim();
    const hasAttachedForm = Boolean(sec.pageFormId || rawFormKey || sec.pageForm);
    if (!hasAttachedForm) {
      return { html: hydratedHtml, css: '' };
    }

    // Never duplicate if the template itself already rendered an inline {{ Form ... }}
    if (/<form\b|data-form-key=|oz-injected-form|oz-dynamic-form|oz-form-placeholder/i.test(hydratedHtml)) {
      return { html: hydratedHtml, css: '' };
    }

    const effectiveKey = rawFormKey || 'Contact_Us';
    const scopeId = this.buildScopeId(sec.id);
    const widthPreset = this.normalizeWidthPreset(sec.formWidthPreset);
    const placement = this.normalizePlacement(sec.formPlacementMode, widthPreset);
    const customPct = this.clampPercent(sec.formCustomWidthPercent ?? 45);
    const hideMedia = Boolean(sec.hideSectionImageWhenFormActive) && widthPreset !== '100';

    const formCardHtml = this.buildFormCardMarkup(effectiveKey, sec.pageForm);

    // Case 1: Full-width (100%) stacked directly Before or After the section
    if (widthPreset === '100') {
      const stackCss = this.buildStackedCss(scopeId);
      const wrappedForm = `
        <section id="${scopeId}" class="oz-composed-form-band">
          <div class="oz-composed-form-container">
            ${formCardHtml}
          </div>
        </section>`;

      const combinedHtml = placement === 'before_section'
        ? `${wrappedForm}\n${hydratedHtml}`
        : `${hydratedHtml}\n${wrappedForm}`;

      return { html: combinedHtml, css: stackCss };
    }

    // Case 2: Side-by-side layout (30%, 50%, or custom %) on Left or Right
    const formPercent = widthPreset === '30' ? 30 : widthPreset === '50' ? 50 : customPct;
    const isFormLeft = placement === 'beside_left';
    const splitCss = this.buildBesideCss(scopeId, formPercent, isFormLeft, hideMedia);
    const sectionPaneClass = hideMedia ? 'oz-comp-section-pane oz-comp-hide-media' : 'oz-comp-section-pane';

    const sectionPane = `<div class="${sectionPaneClass}">${hydratedHtml}</div>`;
    const formPane = `<div class="oz-comp-form-pane">${formCardHtml}</div>`;

    const composedHtml = `
      <div id="${scopeId}" class="oz-composed-split-wrap">
        <div class="oz-composed-split-grid">
          ${isFormLeft ? formPane + '\n' + sectionPane : sectionPane + '\n' + formPane}
        </div>
      </div>`;

    return { html: composedHtml, css: splitCss };
  }

  /**
   * Builds styled HTML markup from dynamic Form Builder `pageForm.fields` when available,
   * or clean fallback fields matching `formKey`.
   */
  private buildFormCardMarkup(formKey: string, pageForm?: any): string {
    const title = this.escapeHtml(pageForm?.title || this.formatFormKeyTitle(formKey));
    const description = pageForm?.description ? this.escapeHtml(pageForm.description) : '';
    const submitLabel = this.escapeHtml(pageForm?.submitButtonText || 'Submit Request');
    const fields: any[] = Array.isArray(pageForm?.fields)
      ? [...pageForm.fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      : [];

    const fieldsHtml = fields.length > 0
      ? fields.map(f => this.renderDynamicField(f)).join('\n')
      : this.renderFallbackFieldsHtml(formKey);

    return `
      <div class="oz-comp-form-card">
        <div class="oz-comp-form-header">
          <h3 class="oz-comp-form-title">${title}</h3>
          ${description ? `<p class="oz-comp-form-desc">${description}</p>` : ''}
        </div>
        <form class="oz-injected-form oz-composed-form" data-form-key="${this.escapeAttr(formKey)}" onsubmit="event.preventDefault();">
          <div class="row g-3">
            ${fieldsHtml}
            <div class="col-12 oz-recaptcha-wrap my-2">
              <div class="g-recaptcha" data-sitekey=""></div>
            </div>
            <div class="col-12 mt-3">
              <button type="submit" class="oz-comp-submit-btn">${submitLabel}</button>
            </div>
          </div>
        </form>
      </div>`;
  }

  /**
   * Renders an individual Form Builder PageFormField into responsive Bootstrap column markup.
   */
  private renderDynamicField(field: any): string {
    const colClass = field.gridWidth === 'col-md-6' ? 'col-md-6' : 'col-12';
    const key = this.escapeAttr(field.fieldKey || 'field');
    const label = this.escapeHtml(field.label || field.fieldKey || 'Field');
    const reqMark = field.isRequired ? ' <span class="oz-req">*</span>' : '';
    const reqAttr = field.isRequired ? 'required' : '';
    const placeholder = this.escapeAttr(field.placeholder || '');
    const help = field.helpText ? `<small class="oz-comp-help">${this.escapeHtml(field.helpText)}</small>` : '';
    const type = (field.fieldType || 'text').toLowerCase().trim();
    const options = this.parseOptions(field.optionsJson);

    if (type === 'textarea') {
      return `
        <div class="${colClass}">
          <label class="oz-comp-label">${label}${reqMark}</label>
          <textarea name="${key}" class="form-control oz-comp-input" rows="4" placeholder="${placeholder}" ${reqAttr}></textarea>
          ${help}
        </div>`;
    }

    if (type === 'dropdown' || type === 'select') {
      const optTags = options.map(opt => `<option value="${this.escapeAttr(opt)}">${this.escapeHtml(opt)}</option>`).join('');
      return `
        <div class="${colClass}">
          <label class="oz-comp-label">${label}${reqMark}</label>
          <select name="${key}" class="form-select oz-comp-input" ${reqAttr}>
            <option value="">-- Select an option --</option>
            ${optTags}
          </select>
          ${help}
        </div>`;
    }

    if ((type === 'radio' || type === 'pill_select') && options.length > 0) {
      const radioItems = options.map((opt, idx) => `
        <label class="oz-comp-choice">
          <input type="radio" name="${key}" value="${this.escapeAttr(opt)}" ${idx === 0 && field.isRequired ? 'required' : ''} />
          <span>${this.escapeHtml(opt)}</span>
        </label>`).join('');
      return `
        <div class="${colClass}">
          <label class="oz-comp-label">${label}${reqMark}</label>
          <div class="oz-comp-choice-group">${radioItems}</div>
          ${help}
        </div>`;
    }

    if (type === 'checkbox') {
      const legalLinks = this.parseLegalLinks(field.optionsJson);
      if (legalLinks.length > 0) {
        const linksHtml = legalLinks.map((lnk, idx) => {
          const sep = idx === 0 ? ' ' : (idx === legalLinks.length - 1 ? ' and ' : ', ');
          const href = this.escapeAttr(lnk.href);
          const text = this.escapeHtml(lnk.linkText);
          return `${sep}<a href="${href}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="color:#0050E5;font-weight:600;text-decoration:underline;">${text}</a>`;
        }).join('');
        return `
          <div class="${colClass}">
            <label class="oz-comp-choice oz-comp-single-check">
              <input type="checkbox" name="${key}" value="true" ${reqAttr} />
              <span>${label}${linksHtml}${reqMark}</span>
            </label>
            ${help}
          </div>`;
      }
      if (options.length > 0) {
        const checkItems = options.map(opt => `
          <label class="oz-comp-choice">
            <input type="checkbox" name="${key}" value="${this.escapeAttr(opt)}" />
            <span>${this.escapeHtml(opt)}</span>
          </label>`).join('');
        return `
          <div class="${colClass}">
            <label class="oz-comp-label">${label}${reqMark}</label>
            <div class="oz-comp-choice-group">${checkItems}</div>
            ${help}
          </div>`;
      }
      return `
        <div class="${colClass}">
          <label class="oz-comp-choice oz-comp-single-check">
            <input type="checkbox" name="${key}" value="true" ${reqAttr} />
            <span>${label}${reqMark}</span>
          </label>
          ${help}
        </div>`;
    }

    const inputType = type === 'email' ? 'email'
      : (type === 'phone' || type === 'tel') ? 'tel'
      : type === 'number' ? 'number'
      : type === 'date' ? 'date'
      : type === 'url' ? 'url'
      : 'text';

    return `
      <div class="${colClass}">
        <label class="oz-comp-label">${label}${reqMark}</label>
        <input type="${inputType}" name="${key}" class="form-control oz-comp-input" placeholder="${placeholder}" ${reqAttr} />
        ${help}
      </div>`;
  }

  /**
   * Provides default fields when a formKey is attached without populated PageFormField rows.
   */
  private renderFallbackFieldsHtml(formKey: string): string {
    const norm = formKey.toLowerCase().replace(/-/g, '_');

    if (norm.includes('newsletter') || norm.includes('subscribe')) {
      return `
        <div class="col-12">
          <label class="oz-comp-label">Work or Personal Email <span class="oz-req">*</span></label>
          <input type="email" name="email" class="form-control oz-comp-input" placeholder="name@company.com" required />
        </div>`;
    }

    if (norm.includes('registration')) {
      return `
        <div class="col-md-6">
          <label class="oz-comp-label">Full Name <span class="oz-req">*</span></label>
          <input type="text" name="full_name" class="form-control oz-comp-input" placeholder="e.g. First Last" required />
        </div>
        <div class="col-md-6">
          <label class="oz-comp-label">Work Email <span class="oz-req">*</span></label>
          <input type="email" name="email" class="form-control oz-comp-input" placeholder="name@company.com" required />
        </div>
        <div class="col-md-6">
          <label class="oz-comp-label">Organization Name</label>
          <input type="text" name="organization_name" class="form-control oz-comp-input" placeholder="e.g. Your Organization Name" />
        </div>
        <div class="col-md-6">
          <label class="oz-comp-label">Phone Number</label>
          <input type="tel" name="phone" class="form-control oz-comp-input" placeholder="e.g. +0 (000) 000-0000" />
        </div>
        <div class="col-12">
          <label class="oz-comp-label">Notes / Onboarding Goals</label>
          <textarea name="message" class="form-control oz-comp-input" rows="3" placeholder="Tell us briefly what you want to set up..."></textarea>
        </div>`;
    }

    return `
      <div class="col-md-6">
        <label class="oz-comp-label">Full Name <span class="oz-req">*</span></label>
        <input type="text" name="full_name" class="form-control oz-comp-input" placeholder="e.g. First Last" required />
      </div>
      <div class="col-md-6">
        <label class="oz-comp-label">Email Address <span class="oz-req">*</span></label>
        <input type="email" name="email" class="form-control oz-comp-input" placeholder="name@company.com" required />
      </div>
      <div class="col-12">
        <label class="oz-comp-label">Subject</label>
        <input type="text" name="subject" class="form-control oz-comp-input" placeholder="How can we help?" />
      </div>
      <div class="col-12">
        <label class="oz-comp-label">Message <span class="oz-req">*</span></label>
        <textarea name="message" class="form-control oz-comp-input" rows="4" placeholder="Share your inquiry details..." required></textarea>
      </div>`;
  }

  /**
   * Generates scoped CSS for 100% stacked form bands (Before / After Section).
   */
  private buildStackedCss(scopeId: string): string {
    return `
      #${scopeId}.oz-composed-form-band {
        padding: 36px 20px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
      }
      #${scopeId} .oz-composed-form-container {
        max-width: 960px;
        margin: 0 auto;
      }
      ${this.buildSharedCardCss(scopeId)}
    `;
  }

  /**
   * Generates scoped CSS for side-by-side section + form split layouts (30%, 50%, Custom %).
   */
  private buildBesideCss(scopeId: string, formPercent: number, isFormLeft: boolean, hideMedia: boolean): string {
    const colRule = isFormLeft
      ? `${formPercent}% minmax(0, 1fr)`
      : `minmax(0, 1fr) ${formPercent}%`;

    const hideMediaCss = hideMedia ? `
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media img,
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media picture,
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media figure,
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media [class*="image"]:not(:has(h1,h2,h3,p,form)),
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media .col-lg-6:has(> img):not(:has(h1,h2,h3,p)),
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media .col-md-6:has(> img):not(:has(h1,h2,h3,p)) {
        display: none !important;
      }
      #${scopeId} .oz-comp-section-pane.oz-comp-hide-media .row > [class*="col-"] {
        flex: 0 0 100% !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    ` : '';

    return `
      #${scopeId}.oz-composed-split-wrap {
        width: 100%;
        padding: 40px 20px;
      }
      #${scopeId} .oz-composed-split-grid {
        max-width: 1320px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: ${colRule};
        gap: 32px;
        align-items: start;
      }
      #${scopeId} .oz-comp-section-pane,
      #${scopeId} .oz-comp-form-pane {
        min-width: 0;
      }
      #${scopeId} .oz-comp-section-pane section {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
      ${hideMediaCss}
      @media (max-width: 991px) {
        #${scopeId} .oz-composed-split-grid {
          grid-template-columns: 1fr;
        }
      }
      ${this.buildSharedCardCss(scopeId)}
    `;
  }

  private buildSharedCardCss(scopeId: string): string {
    return `
      #${scopeId} .oz-comp-form-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
      }
      #${scopeId} .oz-comp-form-header { margin-bottom: 18px; }
      #${scopeId} .oz-comp-form-title {
        font-size: 1.35rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 6px;
      }
      #${scopeId} .oz-comp-form-desc {
        font-size: 0.92rem;
        color: #475569;
        margin: 0;
      }
      #${scopeId} .oz-comp-label {
        display: block;
        font-size: 0.82rem;
        font-weight: 600;
        color: #334155;
        margin-bottom: 6px;
      }
      #${scopeId} .oz-req { color: #dc2626; }
      #${scopeId} .oz-comp-input {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 0.92rem;
      }
      #${scopeId} .oz-comp-input:focus {
        outline: none;
        border-color: #0050e5;
        box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.14);
      }
      #${scopeId} .oz-comp-choice-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      #${scopeId} .oz-comp-choice {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 7px 12px;
        font-size: 0.85rem;
        color: #1e293b;
        cursor: pointer;
      }
      #${scopeId} .oz-comp-help {
        display: block;
        font-size: 0.78rem;
        color: #64748b;
        margin-top: 4px;
      }
      #${scopeId} .oz-comp-submit-btn {
        background: #0050e5;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 12px 24px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        width: 100%;
        transition: background 0.15s ease;
      }
      #${scopeId} .oz-comp-submit-btn:hover { background: #003eb5; }
    `;
  }

  private normalizeWidthPreset(raw: any): '30' | '50' | '100' | 'custom' {
    const val = String(raw || '50').trim().toLowerCase();
    if (val === '30' || val === '30%') return '30';
    if (val === '100' || val === '100%') return '100';
    if (val === 'custom') return 'custom';
    return '50';
  }

  private normalizePlacement(
    raw: any,
    widthPreset: '30' | '50' | '100' | 'custom'
  ): 'beside_left' | 'beside_right' | 'before_section' | 'after_section' {
    const val = String(raw || '').trim().toLowerCase();
    if (widthPreset === '100') {
      return val === 'before_section' ? 'before_section' : 'after_section';
    }
    return val === 'beside_left' ? 'beside_left' : 'beside_right';
  }

  private clampPercent(val: number): number {
    const num = Number(val);
    if (isNaN(num)) return 45;
    return Math.min(80, Math.max(20, Math.round(num)));
  }

  private buildScopeId(rawId: any): string {
    const clean = String(rawId || Math.random().toString(36).slice(2, 10)).replace(/[^a-zA-Z0-9_-]/g, '');
    return `oz_sec_comp_${clean}`;
  }

  private formatFormKeyTitle(key: string): string {
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim() || 'Get in Touch';
  }

  private parseOptions(optionsJson?: string): string[] {
    if (!optionsJson) return [];
    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed)) return parsed.map(x => String(x));
    } catch {
      return optionsJson.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  /** Parses structured legal consent links stored in `optionsJson` for single Agreement Checkboxes. */
  private parseLegalLinks(optionsJson?: string): Array<{ linkText: string; href: string }> {
    if (!optionsJson) return [];
    try {
      const parsed = JSON.parse(optionsJson);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x: any) => x && typeof x === 'object' && (x.linkText || x.pageSlug || x.customUrl))
        .map((x: any) => {
          const custom = x.customUrl ? String(x.customUrl).trim() : '';
          const slug = x.pageSlug && x.pageSlug !== '__custom__' ? String(x.pageSlug).replace(/^\/+/, '') : '';
          return {
            linkText: String(x.linkText || 'Terms & Conditions'),
            href: custom || (slug ? `/p/${slug}` : '#')
          };
        });
    } catch {
      return [];
    }
  }

  private escapeHtml(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttr(str: string): string {
    return this.escapeHtml(str);
  }
}

