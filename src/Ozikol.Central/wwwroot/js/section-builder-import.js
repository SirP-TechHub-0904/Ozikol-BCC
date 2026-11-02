/**
 * section-builder-import.js
 * Modular Section Studio Controller
 * Handles Multi-Channel Ingestion (HTML File/Paste, Live URL, Screenshot AI),
 * Prominent File Upload Display, High-Visibility Processing Loaders, Grid & Table Matrix Workbench,
 * Sandbox Live Previews with Multi-Device Viewports, 6-Tab Code/Tokens/Libraries/AI Inspector,
 * and Persistent Database Staging.
 */

var rawExtractionData = null;
var activePreviewIndex = 0;
var loadingIntervalId = null;
var liveRenderDebounceTimer = null;
var currentWorkbenchView = 'grid'; // 'grid' | 'table'

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    var extractJsonEl = document.getElementById('rawExtractionJsonData');
    if (extractJsonEl && extractJsonEl.textContent) {
        var extText = extractJsonEl.textContent.trim();
        if (extText && extText !== 'null') {
            try {
                rawExtractionData = JSON.parse(extText);
                if (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections.length > 0) {
                    renderWorkbenchSections(rawExtractionData);
                    jumpToStep(2);
                }
            } catch (e) {
                console.error('[SectionStudio] Failed to parse initial extraction JSON:', e);
            }
        }
    }

    updateHtmlCharCount();
    initDropzones();
});

/**
 * Initialize drag & drop and click listeners for file dropzones.
 */
function initDropzones() {
    var setup = function (dropzoneId, inputId, onSelect) {
        var dz = document.getElementById(dropzoneId);
        var input = document.getElementById(inputId);
        if (!dz || !input) return;

        ['dragenter', 'dragover'].forEach(function (evt) {
            dz.addEventListener(evt, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dz.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(function (evt) {
            dz.addEventListener(evt, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dz.classList.remove('dragover');
            });
        });

        dz.addEventListener('drop', function (e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                input.files = e.dataTransfer.files;
                if (typeof onSelect === 'function') {
                    onSelect(input);
                }
            }
        });
    };

    setup('htmlDropzoneArea', 'sourceHtmlFileInput', handleHtmlFileSelect);
    setup('imageDropzoneArea', 'visionScreenshotInput', handleImageFileSelect);
}

/**
 * Jump to specific studio step (1: Ingest, 2: Workbench, 3: Preview & Publish).
 */
function jumpToStep(step) {
    var p1 = document.getElementById('stepPanel1');
    var p2 = document.getElementById('stepPanel2');
    var modal = document.getElementById('sectionPreviewModal');

    // Update stepper pill active states
    var pill1 = document.getElementById('pillStep1');
    var pill2 = document.getElementById('pillStep2');
    var pill3 = document.getElementById('pillStep3');

    if (pill1) pill1.classList.remove('active');
    if (pill2) pill2.classList.remove('active');
    if (pill3) pill3.classList.remove('active');

    if (step === 1) {
        if (p1) p1.style.display = 'block';
        if (p2) p2.style.display = 'none';
        if (modal) modal.classList.remove('is-active');
        if (pill1) pill1.classList.add('active');
    } else if (step === 2) {
        var hasSectionsInDom = document.querySelectorAll('.section-card-col').length > 0 || document.querySelectorAll('#extractedSectionsTableBody tr').length > 0;
        var hasExtractionData = rawExtractionData && rawExtractionData.sections && rawExtractionData.sections.length > 0;
        if (!hasSectionsInDom && !hasExtractionData) {
            alert('Please ingest an HTML file, Live URL, or UI Screenshot first.');
            jumpToStep(1);
            return;
        }
        if (p1) p1.style.display = 'none';
        if (p2) p2.style.display = 'block';
        if (modal) modal.classList.remove('is-active');
        if (pill2) pill2.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 3) {
        var hasSections = (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections.length > 0);
        if (hasSections) {
            if (pill3) pill3.classList.add('active');
            openSectionPreviewModal(activePreviewIndex || 0);
        } else {
            alert('Please extract modular sections first.');
            jumpToStep(1);
        }
    }
}

/**
 * Switches between "HTML File / Paste Source", "Live Website URL", and "UI Screenshot Mockup" tabs.
 */
function switchImportTab(tabName) {
    var panelSource = document.getElementById('panelSourceExtractor');
    var panelUrl = document.getElementById('panelUrlExtractor');
    var panelImage = document.getElementById('panelImageExtractor');

    var btnSource = document.getElementById('tabBtnSource');
    var btnUrl = document.getElementById('tabBtnUrl');
    var btnImage = document.getElementById('tabBtnImage');

    if (panelSource) panelSource.style.display = 'none';
    if (panelUrl) panelUrl.style.display = 'none';
    if (panelImage) panelImage.style.display = 'none';

    if (btnSource) btnSource.classList.remove('active');
    if (btnUrl) btnUrl.classList.remove('active');
    if (btnImage) btnImage.classList.remove('active');

    if (tabName === 'source') {
        if (panelSource) panelSource.style.display = 'block';
        if (btnSource) btnSource.classList.add('active');
    } else if (tabName === 'url') {
        if (panelUrl) panelUrl.style.display = 'block';
        if (btnUrl) btnUrl.classList.add('active');
    } else if (tabName === 'image') {
        if (panelImage) panelImage.style.display = 'block';
        if (btnImage) btnImage.classList.add('active');
    }
}

/**
 * Real-time character count for pasted HTML.
 */
function updateHtmlCharCount() {
    var el = document.getElementById('sourcePastedHtml');
    var counter = document.getElementById('htmlCharCounter');
    if (el && counter) {
        var len = el.value.length;
        counter.textContent = len.toLocaleString() + ' characters';
    }
}

/**
 * Handle HTML file selection: shows prominent attached file box and auto-names suite.
 */
function handleHtmlFileSelect(input) {
    var dropzone = document.getElementById('htmlDropzoneArea');
    var attachedBox = document.getElementById('attachedHtmlFileBox');
    var nameEl = document.getElementById('attachedHtmlFileName');
    var sizeEl = document.getElementById('attachedHtmlFileSize');
    var suiteInput = document.getElementById('sourceSuiteName');

    if (input.files && input.files[0]) {
        var file = input.files[0];
        var sizeStr = (file.size / 1024).toFixed(1) + ' KB';
        if (file.size > 1024 * 1024) {
            sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        }

        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = sizeStr;

        if (dropzone) dropzone.style.display = 'none';
        if (attachedBox) attachedBox.style.display = 'flex';

        // Auto-fill suite name if default or empty
        if (suiteInput && (!suiteInput.value || suiteInput.value === 'Pasted Suite' || suiteInput.value === 'Imported Suite' || suiteInput.value.includes('Suite'))) {
            var cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
            if (cleanName) {
                suiteInput.value = cleanName;
            }
        }
    }
}

/**
 * Clears the selected HTML file and resets dropzone.
 */
function clearHtmlFile() {
    var input = document.getElementById('sourceHtmlFileInput');
    var dropzone = document.getElementById('htmlDropzoneArea');
    var attachedBox = document.getElementById('attachedHtmlFileBox');

    if (input) input.value = '';
    if (attachedBox) attachedBox.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';
}

/**
 * Handle UI Screenshot image selection.
 */
function handleImageFileSelect(input) {
    var dropzone = document.getElementById('imageDropzoneArea');
    var attachedBox = document.getElementById('attachedImageFileBox');
    var nameEl = document.getElementById('attachedImageFileName');
    var sizeEl = document.getElementById('attachedImageFileSize');
    var thumbEl = document.getElementById('attachedImageThumb');
    var suiteInput = document.getElementById('imgSuiteName');

    if (input.files && input.files[0]) {
        var file = input.files[0];
        var sizeStr = (file.size / 1024).toFixed(1) + ' KB';
        if (file.size > 1024 * 1024) {
            sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        }

        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = sizeStr;

        if (thumbEl) {
            var reader = new FileReader();
            reader.onload = function (e) {
                thumbEl.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        if (dropzone) dropzone.style.display = 'none';
        if (attachedBox) attachedBox.style.display = 'flex';

        if (suiteInput && (!suiteInput.value || suiteInput.value === 'Pasted Suite' || suiteInput.value === 'Imported Suite' || suiteInput.value.includes('Suite'))) {
            var cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
            if (cleanName) {
                suiteInput.value = cleanName;
            }
        }
    }
}

/**
 * Clears the selected screenshot image.
 */
function clearImageFile() {
    var input = document.getElementById('visionScreenshotInput');
    var dropzone = document.getElementById('imageDropzoneArea');
    var attachedBox = document.getElementById('attachedImageFileBox');

    if (input) input.value = '';
    if (attachedBox) attachedBox.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';
}

/**
 * High-Visibility Loading Overlay Controller
 */
function showStudioLoading(title, subtitle) {
    var overlay = document.getElementById('studioLoadingOverlay');
    var titleEl = document.getElementById('loadingOverlayTitle');
    var subtitleEl = document.getElementById('loadingOverlaySubtitle');
    var timerEl = document.getElementById('loadingOverlayTimer');

    if (titleEl) titleEl.textContent = title || 'Preparing Your Sections...';
    if (subtitleEl) subtitleEl.textContent = subtitle || 'Reading your template, styling components, and organizing sections.';

    var elapsed = 0;
    if (timerEl) timerEl.textContent = '0s elapsed';

    if (loadingIntervalId) clearInterval(loadingIntervalId);
    loadingIntervalId = setInterval(function () {
        elapsed++;
        if (timerEl) timerEl.textContent = elapsed + 's elapsed';

        var step1 = document.getElementById('loadStep1');
        var step2 = document.getElementById('loadStep2');
        var step3 = document.getElementById('loadStep3');
        var step4 = document.getElementById('loadStep4');

        if (elapsed >= 1 && step1) {
            step1.classList.add('step-done');
            var icon1 = step1.querySelector('.material-symbols-outlined');
            if (icon1) icon1.textContent = 'check_circle';
        }
        if (elapsed >= 2 && step2) {
            step2.classList.add('step-active');
        }
        if (elapsed >= 4 && step2 && step3) {
            step2.classList.replace('step-active', 'step-done');
            var icon2 = step2.querySelector('.material-symbols-outlined');
            if (icon2) icon2.textContent = 'check_circle';
            step3.classList.add('step-active');
        }
        if (elapsed >= 7 && step3 && step4) {
            step3.classList.replace('step-active', 'step-done');
            var icon3 = step3.querySelector('.material-symbols-outlined');
            if (icon3) icon3.textContent = 'check_circle';
            step4.classList.add('step-active');
        }
    }, 1000);

    if (overlay) overlay.style.display = 'flex';
}

function hideStudioLoading() {
    if (loadingIntervalId) {
        clearInterval(loadingIntervalId);
        loadingIntervalId = null;
    }
    var overlay = document.getElementById('studioLoadingOverlay');
    if (overlay) overlay.style.display = 'none';

    // Reset step indicators
    ['loadStep1', 'loadStep2', 'loadStep3', 'loadStep4'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.className = 'loading-step-item';
            var icon = el.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = 'radio_button_unchecked';
        }
    });
}

/**
 * Execute Ingestion for Tab 1: HTML File / Paste
 */
async function executeSourceIngest() {
    var btn = document.getElementById('btnRunSourceIngest');
    var form = document.getElementById('formSourceIngest');
    var formData = new FormData(form);

    var fileInput = document.getElementById('sourceHtmlFileInput');
    var pastedHtml = document.getElementById('sourcePastedHtml').value.trim();

    if ((!fileInput.files || fileInput.files.length === 0) && !pastedHtml) {
        alert('Please select an .html template file or paste HTML markup before proceeding.');
        return;
    }

    if (btn) btn.disabled = true;
    showStudioLoading('Importing Your HTML Template...', 'Reading your page layout, styling each section, and preparing your live preview.');

    try {
        var resp = await fetch('?handler=UploadHtml', {
            method: 'POST',
            body: formData
        });
        var result = await resp.json();
        hideStudioLoading();

        if (result.success && result.data) {
            rawExtractionData = result.data;
            renderWorkbenchSections(result.data);
            jumpToStep(2);
        } else {
            alert('Extraction Failed: ' + (result.message || 'Unknown server error.'));
        }
    } catch (err) {
        hideStudioLoading();
        console.error(err);
        alert('Network or server error occurred during ingestion.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Execute Ingestion for Tab 2: Live Website URL
 */
async function executeUrlIngest() {
    var btn = document.getElementById('btnRunUrlIngest');
    var url = document.getElementById('targetWebsiteUrl').value.trim();
    var suite = document.getElementById('urlSuiteName').value.trim();
    var brand = document.getElementById('urlBrandName').value.trim();

    if (!url) {
        alert('Please enter a valid website or landing page URL.');
        return;
    }

    var formData = new FormData();
    formData.append('targetUrl', url);
    formData.append('suiteName', suite);
    formData.append('brandName', brand);

    var tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    if (tokenInput) {
        formData.append('__RequestVerificationToken', tokenInput.value);
    }

    if (btn) btn.disabled = true;
    showStudioLoading('Importing Website...', 'Fetching page assets, styling components, and preparing sections for your preview.');

    try {
        var resp = await fetch('?handler=CrawlUrl', {
            method: 'POST',
            body: formData
        });
        var result = await resp.json();
        hideStudioLoading();

        if (result.success && result.data) {
            rawExtractionData = result.data;
            renderWorkbenchSections(result.data);
            jumpToStep(2);
        } else {
            alert('Crawl Failed: ' + (result.message || 'Unknown server error.'));
        }
    } catch (err) {
        hideStudioLoading();
        console.error(err);
        alert('Error crawling live URL.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Execute Ingestion for Tab 3: UI Screenshot Mockup (Vision AI)
 */
async function executeImageIngest() {
    var btn = document.getElementById('btnRunImageIngest');
    var form = document.getElementById('formImageIngest');
    var formData = new FormData(form);

    var fileInput = document.getElementById('visionScreenshotInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a screenshot image to decompose.');
        return;
    }

    if (btn) btn.disabled = true;
    showStudioLoading('Analyzing Screenshot with AI...', 'Converting your design into clean layouts, styles, and customizable sections.');

    try {
        var resp = await fetch('?handler=VisionScreenshot', {
            method: 'POST',
            body: formData
        });
        var result = await resp.json();
        hideStudioLoading();

        if (result.success && result.data) {
            rawExtractionData = result.data;
            renderWorkbenchSections(result.data);
            jumpToStep(2);
        } else {
            alert('Vision Decomposition Failed: ' + (result.message || 'Unknown server error.'));
        }
    } catch (err) {
        hideStudioLoading();
        console.error(err);
        alert('Error processing UI screenshot.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Toggle between Grid and Table Matrix views in Step 2 Workbench.
 */
function setWorkbenchView(view) {
    currentWorkbenchView = view;
    var gridEl = document.getElementById('extractedSectionsGrid');
    var tableWrapEl = document.getElementById('extractedSectionsTableWrap');
    var btnGrid = document.getElementById('btnViewGrid');
    var btnTable = document.getElementById('btnViewTable');

    if (view === 'grid') {
        if (gridEl) gridEl.style.display = 'grid';
        if (tableWrapEl) tableWrapEl.style.display = 'none';
        if (btnGrid) btnGrid.classList.add('active');
        if (btnTable) btnTable.classList.remove('active');
    } else {
        if (gridEl) gridEl.style.display = 'none';
        if (tableWrapEl) tableWrapEl.style.display = 'block';
        if (btnGrid) btnGrid.classList.remove('active');
        if (btnTable) btnTable.classList.add('active');
    }
}

/**
 * Helper to normalize section DTO property names (supporting camelCase, snake_case, or PascalCase).
 */
function normalizeSectionProps(sec, idx) {
    var name = sec.name || sec.title || sec.Name || ('Section ' + (idx + 1));
    var variant = sec.variantCode || sec.variant_code || sec.VariantCode || ('sec_' + (idx + 1));
    var category = sec.categoryKey || sec.category_key || sec.CategoryKey || 'bodysections';
    var desc = sec.description || sec.Description || 'Decomposed modular component.';
    var html = sec.htmlTemplate || sec.html_template || sec.HtmlTemplate || sec.tokenizedHtml || sec.tokenized_html || sec.rawHtml || sec.raw_html || '';
    var css = sec.scopedCss || sec.scoped_css || sec.ScopedCss || '';
    var js = sec.jsScript || sec.js_script || sec.JsScript || '';
    var sampleJson = sec.sampleContentJson || sec.sample_content_json || sec.SampleContentJson || sec.mockSchemaJson || sec.mock_schema_json || '{}';
    var libs = sec.requiredLibraries || sec.required_libraries || sec.RequiredLibraries || [];

    if (typeof libs === 'string') {
        try { libs = JSON.parse(libs); } catch (e) { libs = []; }
    }
    if (!Array.isArray(libs) || libs.length === 0) {
        if (typeof SectionLibraryResolver !== 'undefined' && SectionLibraryResolver.detectLibraries) {
            libs = SectionLibraryResolver.detectLibraries(html, js);
        }
    }

    var resolved = (typeof SectionLibraryResolver !== 'undefined' && SectionLibraryResolver.resolveAssets)
        ? SectionLibraryResolver.resolveAssets(libs)
        : { cssLibraries: [], jsLibraries: [], css: [], js: [], autoInits: [] };

    var cssLibs = sec.requiredCssLibraries || sec.required_css_libraries || sec.RequiredCssLibraries || resolved.cssLibraries || [];
    var jsLibs = sec.requiredJsLibraries || sec.required_js_libraries || sec.RequiredJsLibraries || resolved.jsLibraries || [];

    if (typeof cssLibs === 'string') {
        try { cssLibs = JSON.parse(cssLibs); } catch (e) { cssLibs = []; }
    }
    if (typeof jsLibs === 'string') {
        try { jsLibs = JSON.parse(jsLibs); } catch (e) { jsLibs = []; }
    }

    return {
        id: sec.id || sec.Id || 0,
        name: name,
        variantCode: variant,
        categoryKey: category,
        description: desc,
        htmlTemplate: html,
        scopedCss: css,
        jsScript: js,
        sampleContentJson: sampleJson,
        requiredLibraries: libs,
        requiredCssLibraries: cssLibs,
        requiredJsLibraries: jsLibs
    };
}

/**
 * Renders Extracted Sections into Step 2 Workbench Grid & Table Matrix.
 */
function renderWorkbenchSections(data) {
    var gridContainer = document.getElementById('extractedSectionsGrid');
    var tableBody = document.getElementById('extractedSectionsTableBody');
    if (!data || !data.sections) return;

    var suiteTitle = data.suiteName || data.suite_name || 'Extracted Suite';
    var titleEl = document.getElementById('workbenchSuiteTitle');
    var badgeEl = document.getElementById('workbenchCountBadge');

    if (titleEl) titleEl.textContent = suiteTitle;
    if (badgeEl) badgeEl.textContent = data.sections.length + ' sections';

    var gridHtml = '';
    var tableHtml = '';

    data.sections.forEach(function (rawSec, idx) {
        var sec = normalizeSectionProps(rawSec, idx);
        // Persist normalized props back into in-memory array for consistent downstream editing
        data.sections[idx] = Object.assign(rawSec, sec);

        var linesCss = sec.scopedCss ? sec.scopedCss.split('\n').filter(function (l) { return l.trim().length > 0; }).length : 0;
        var hasJs = sec.jsScript && sec.jsScript.trim().length > 0;
        var tokenCount = 0;
        try {
            tokenCount = Object.keys(JSON.parse(sec.sampleContentJson)).length;
        } catch (e) { }

        var cssLibsBadges = (sec.requiredCssLibraries && sec.requiredCssLibraries.length > 0)
            ? sec.requiredCssLibraries.map(function (lib) {
                return `<span class="badge-pill" style="font-size: 10.5px; padding: 2px 6px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);"><span class="material-symbols-outlined" style="font-size: 11px;">css</span> ${lib}</span>`;
            }).join(' ')
            : '<span style="color: var(--admin-text-dim); font-size: 11px;">None</span>';

        var jsLibsBadges = (sec.requiredJsLibraries && sec.requiredJsLibraries.length > 0)
            ? sec.requiredJsLibraries.map(function (lib) {
                return `<span class="badge-pill" style="font-size: 10.5px; padding: 2px 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);"><span class="material-symbols-outlined" style="font-size: 11px;">javascript</span> ${lib}</span>`;
            }).join(' ')
            : '<span style="color: var(--admin-text-dim); font-size: 11px;">None</span>';

        // 1. Grid Card
        gridHtml += `
        <div class="section-card-item section-card-col" data-category="${sec.categoryKey}" id="workbenchSectionCard_${idx}">
            <div class="section-card-header">
                <div>
                    <span class="badge-pill badge-pill-primary">${sec.categoryKey}</span>
                    <span style="font-family: monospace; font-size: 11px; color: var(--admin-text-muted); margin-left: 6px;">${sec.variantCode}</span>
                </div>
                <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" onclick="openSectionPreviewModal(${idx})">
                    <span class="material-symbols-outlined" style="font-size: 15px;">visibility</span> Preview
                </button>
            </div>
            <div class="section-card-body">
                <div style="font-weight: 700; font-size: 14.5px; color: var(--admin-text); margin-bottom: 4px;">${sec.name}</div>
                <div style="font-size: 12.5px; color: var(--admin-text-muted); margin-bottom: 14px; min-height: 36px; line-height: 1.4;">${sec.description}</div>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
                    <span class="badge-pill badge-pill-secondary"><span class="material-symbols-outlined" style="font-size: 13px;">css</span> ${linesCss} CSS lines</span>
                    ${hasJs ? '<span class="badge-pill badge-pill-success"><span class="material-symbols-outlined" style="font-size: 13px;">javascript</span> JS Active</span>' : ''}
                    <span class="badge-pill badge-pill-info"><span class="material-symbols-outlined" style="font-size: 13px;">data_object</span> ${tokenCount} Tokens</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--admin-bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--admin-border);">
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--admin-text-muted); margin-right: 2px;">CSS Libs:</span>
                        ${cssLibsBadges}
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--admin-text-muted); margin-right: 2px;">JS Libs:</span>
                        ${jsLibsBadges}
                    </div>
                </div>
            </div>
            <div class="section-card-footer">
                <select class="form-input-styled" style="width: auto; padding: 4px 8px; font-size: 12px;" onchange="updateSectionCategory(${idx}, this.value)">
                    <option value="menu" ${sec.categoryKey === 'menu' ? 'selected' : ''}>Menu / Nav</option>
                    <option value="hero" ${sec.categoryKey === 'hero' ? 'selected' : ''}>Hero Section</option>
                    <option value="bodysections" ${sec.categoryKey === 'bodysections' ? 'selected' : ''}>Body Section</option>
                    <option value="blog" ${sec.categoryKey === 'blog' ? 'selected' : ''}>Blog &amp; Cards</option>
                    <option value="contact" ${sec.categoryKey === 'contact' ? 'selected' : ''}>Contact</option>
                    <option value="footer" ${sec.categoryKey === 'footer' ? 'selected' : ''}>Footer</option>
                </select>
                <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" id="btnPublishCard_${idx}" onclick="publishSingleSectionDirect(${idx})">
                    <span class="material-symbols-outlined" style="font-size: 15px;">cloud_upload</span> Publish
                </button>
            </div>
        </div>`;

        // 2. Table Matrix Row
        tableHtml += `
        <tr class="section-card-col" data-category="${sec.categoryKey}" id="workbenchSectionRow_${idx}">
            <td>
                <span class="badge-pill badge-pill-secondary" style="font-family: monospace;">${sec.variantCode}</span>
            </td>
            <td>
                <div style="font-weight: 700; color: var(--admin-text); font-size: 13.5px;">${sec.name}</div>
                <div style="font-size: 12px; color: var(--admin-text-muted); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sec.description}</div>
            </td>
            <td>
                <select class="form-input-styled" style="padding: 4px 8px; font-size: 12px;" onchange="updateSectionCategory(${idx}, this.value)">
                    <option value="menu" ${sec.categoryKey === 'menu' ? 'selected' : ''}>Menu / Nav</option>
                    <option value="hero" ${sec.categoryKey === 'hero' ? 'selected' : ''}>Hero</option>
                    <option value="bodysections" ${sec.categoryKey === 'bodysections' ? 'selected' : ''}>Body</option>
                    <option value="blog" ${sec.categoryKey === 'blog' ? 'selected' : ''}>Blog</option>
                    <option value="contact" ${sec.categoryKey === 'contact' ? 'selected' : ''}>Contact</option>
                    <option value="footer" ${sec.categoryKey === 'footer' ? 'selected' : ''}>Footer</option>
                </select>
            </td>
            <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <span class="badge-pill badge-pill-secondary" style="font-size: 11px;">${linesCss} CSS</span>
                    <span class="badge-pill badge-pill-info" style="font-size: 11px;">${tokenCount} Tokens</span>
                    ${hasJs ? '<span class="badge-pill badge-pill-success" style="font-size: 11px;">JS</span>' : ''}
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${cssLibsBadges}
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${jsLibsBadges}
                </div>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" onclick="openSectionPreviewModal(${idx})">
                        <span class="material-symbols-outlined" style="font-size: 14px;">visibility</span> Inspect
                    </button>
                    <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" id="btnPublishRow_${idx}" onclick="publishSingleSectionDirect(${idx})">
                        <span class="material-symbols-outlined" style="font-size: 14px;">cloud_upload</span>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    if (gridContainer) gridContainer.innerHTML = gridHtml;
    if (tableBody) tableBody.innerHTML = tableHtml;
}

/**
 * Filter sections by category in Workbench.
 */
function filterSectionsByCategory(cat, btn) {
    document.querySelectorAll('#categoryFilterContainer button').forEach(function (b) {
        b.classList.remove('btn-admin-primary');
        b.classList.add('btn-admin-secondary');
    });
    if (btn) {
        btn.classList.remove('btn-admin-secondary');
        btn.classList.add('btn-admin-primary');
    }

    var cols = document.querySelectorAll('.section-card-col');
    cols.forEach(function (col) {
        if (cat === 'all' || col.getAttribute('data-category') === cat) {
            col.style.display = (col.tagName === 'TR') ? 'table-row' : 'flex';
        } else {
            col.style.display = 'none';
        }
    });
}

/**
 * Updates a section's category key in both in-memory state and UI cards/rows.
 */
function updateSectionCategory(index, newCategory) {
    if (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections[index]) {
        var sec = rawExtractionData.sections[index];
        sec.categoryKey = newCategory;
        sec.category_key = newCategory;

        var card = document.getElementById('workbenchSectionCard_' + index);
        if (card) {
            card.setAttribute('data-category', newCategory);
            var badge = card.querySelector('.badge-pill-primary');
            if (badge) badge.textContent = newCategory;
        }

        var row = document.getElementById('workbenchSectionRow_' + index);
        if (row) {
            row.setAttribute('data-category', newCategory);
        }

        // Auto-save draft change to database in background
        saveDraftEditsToDatabaseSilently(index);
    }
}

var activePreviewCanvasTheme = 'dark';
var hasUnsavedChanges = false;
var cmEditorHtml = null;
var cmEditorCss = null;
var cmEditorJs = null;
var cmEditorMock = null;
var isUpdatingFromCode = false;

/**
 * Initializes CodeMirror 5 editor instances with syntax highlighting and code folding gutters.
 */
function initCodeMirrorEditorsIfNeeded() {
    if (typeof CodeMirror === 'undefined') return;

    var htmlEl = document.getElementById('editorHtmlCode');
    if (!cmEditorHtml && htmlEl) {
        cmEditorHtml = CodeMirror.fromTextArea(htmlEl, {
            mode: 'htmlmixed',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            tabSize: 2
        });
        cmEditorHtml.on('change', function () {
            if (isUpdatingFromCode) return;
            handleCodeManualEdit('html');
        });
    }

    var cssEl = document.getElementById('editorCssCode');
    if (!cmEditorCss && cssEl) {
        cmEditorCss = CodeMirror.fromTextArea(cssEl, {
            mode: 'css',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            tabSize: 2
        });
        cmEditorCss.on('change', function () {
            if (isUpdatingFromCode) return;
            handleCodeManualEdit('css');
        });
    }

    var jsEl = document.getElementById('editorJsCode');
    if (!cmEditorJs && jsEl) {
        cmEditorJs = CodeMirror.fromTextArea(jsEl, {
            mode: 'javascript',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            tabSize: 2
        });
        cmEditorJs.on('change', function () {
            if (isUpdatingFromCode) return;
            handleCodeManualEdit('js');
        });
    }

    var mockEl = document.getElementById('editorMockJsonCode');
    if (!cmEditorMock && mockEl) {
        cmEditorMock = CodeMirror.fromTextArea(mockEl, {
            mode: { name: 'javascript', json: true },
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            tabSize: 2
        });
        cmEditorMock.on('change', function () {
            if (isUpdatingFromCode) return;
            handleMockJsonManualEdit();
        });
    }
}

/**
 * Step 3: Open Section Preview Modal & Sandbox Viewport.
 */
function openSectionPreviewModal(index) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[index]) return;

    activePreviewIndex = index;
    var sec = normalizeSectionProps(rawExtractionData.sections[index], index);
    rawExtractionData.sections[index] = Object.assign(rawExtractionData.sections[index], sec);

    var modal = document.getElementById('sectionPreviewModal');

    // Update Modal Header
    var titleEl = document.getElementById('previewModalSectionTitle');
    var variantEl = document.getElementById('previewModalVariantCode');
    var statusBadge = document.getElementById('previewModalStatusBadge');

    if (titleEl) titleEl.textContent = sec.name || 'Section Preview';
    if (variantEl) variantEl.textContent = sec.variantCode || `sec_variant_${index + 1}`;
    if (statusBadge) {
        statusBadge.textContent = 'Staged in DB';
        statusBadge.className = 'badge-pill badge-pill-info';
    }

    // Initialize CodeMirror Editors
    initCodeMirrorEditorsIfNeeded();
    isUpdatingFromCode = true;

    if (cmEditorHtml) {
        cmEditorHtml.setValue(sec.htmlTemplate || '');
    } else {
        var htmlEditor = document.getElementById('editorHtmlCode');
        if (htmlEditor) htmlEditor.value = sec.htmlTemplate || '';
    }

    if (cmEditorCss) {
        cmEditorCss.setValue(sec.scopedCss || '');
    } else {
        var cssEditor = document.getElementById('editorCssCode');
        if (cssEditor) cssEditor.value = sec.scopedCss || '';
    }

    if (cmEditorJs) {
        cmEditorJs.setValue(sec.jsScript || '');
    } else {
        var jsEditor = document.getElementById('editorJsCode');
        if (jsEditor) jsEditor.value = sec.jsScript || '';
    }

    // Format JSON for readable display in Mock Data Tab
    var formattedJson = '';
    try {
        var parsed = JSON.parse(sec.sampleContentJson || '{}');
        formattedJson = JSON.stringify(parsed, null, 2);
    } catch (e) {
        formattedJson = sec.sampleContentJson || '{}';
    }

    if (cmEditorMock) {
        cmEditorMock.setValue(formattedJson);
    } else {
        var mockEditor = document.getElementById('editorMockJsonCode');
        if (mockEditor) mockEditor.value = formattedJson;
    }

    isUpdatingFromCode = false;

    // Reset unsaved indicator
    clearUnsavedChanges();

    // Populate Libraries Badges (CSS & JS)
    populateLibrariesTab(sec);

    // Switch directly to the Live Preview Tab
    switchInspectorTab('preview');

    if (modal) modal.classList.add('is-active');
}

/**
 * Close Live Preview Modal
 */
function closeSectionPreviewModal() {
    var modal = document.getElementById('sectionPreviewModal');
    if (modal) modal.classList.remove('is-active');
}

/**
 * Toggle Canvas Background Theme (Dark / Bright)
 */
function setPreviewCanvasTheme(theme, btn) {
    activePreviewCanvasTheme = theme;

    var darkBtn = document.getElementById('themeBtnDark');
    var brightBtn = document.getElementById('themeBtnBright');
    if (darkBtn) darkBtn.classList.remove('active');
    if (brightBtn) brightBtn.classList.remove('active');
    if (btn) btn.classList.add('active');

    var frame = document.getElementById('previewSandboxFrame');
    if (frame) {
        if (theme === 'bright') {
            frame.classList.add('canvas-bright');
            frame.classList.remove('canvas-dark');
        } else {
            frame.classList.add('canvas-dark');
            frame.classList.remove('canvas-bright');
        }
    }

    if (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections[activePreviewIndex]) {
        refreshSandboxPreview(rawExtractionData.sections[activePreviewIndex]);
    }
}

/**
 * Mark Unsaved Changes Indicator
 */
function markUnsavedChanges() {
    hasUnsavedChanges = true;
    var ind = document.getElementById('previewUnsavedChangesIndicator');
    if (ind) ind.style.display = 'flex';
}

/**
 * Clear Unsaved Changes Indicator
 */
function clearUnsavedChanges() {
    hasUnsavedChanges = false;
    var ind = document.getElementById('previewUnsavedChangesIndicator');
    if (ind) ind.style.display = 'none';
}

/**
 * Populates CSS and JS Library Badge Lists (Badges only - No checkboxes).
 */
function populateLibrariesTab(sec) {
    var cssContainer = document.getElementById('inspectorCssLibsBadgeList');
    var jsContainer = document.getElementById('inspectorJsLibsBadgeList');
    var cssCountBadge = document.getElementById('cssLibsCountBadge');
    var jsCountBadge = document.getElementById('jsLibsCountBadge');

    if (typeof SectionLibraryResolver === 'undefined') return;

    var catalog = SectionLibraryResolver.catalog;
    var activeLibs = new Set(sec.requiredLibraries || []);

    var cssItems = [];
    var jsItems = [];

    activeLibs.forEach(function (key) {
        var item = catalog[key];
        if (!item) return;

        if (item.css && item.css.length > 0) {
            cssItems.push({
                key: key,
                name: item.name,
                urls: item.css
            });
        }

        if (item.js && item.js.length > 0) {
            jsItems.push({
                key: key,
                name: item.name,
                urls: item.js
            });
        }
    });

    if (cssCountBadge) cssCountBadge.textContent = cssItems.length;
    if (jsCountBadge) jsCountBadge.textContent = jsItems.length;

    if (cssContainer) {
        if (cssItems.length === 0) {
            cssContainer.innerHTML = '<div style="font-size: 12.5px; color: var(--admin-text-muted); padding: 12px; background: var(--admin-bg-surface); border: 1px dashed var(--admin-border); border-radius: var(--radius-md); text-align: center;">No third-party CSS dependencies required for this section.</div>';
        } else {
            cssContainer.innerHTML = cssItems.map(function (item) {
                return `
                <div style="display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; background: var(--admin-bg-surface); border: 1px solid var(--admin-border); border-radius: var(--radius-md);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--admin-text); font-size: 13px;">
                            <span class="material-symbols-outlined" style="font-size: 16px; color: #60a5fa;">palette</span> ${item.name}
                        </div>
                        <span class="badge-pill" style="font-size: 10px; padding: 2px 6px; background: rgba(59, 130, 246, 0.15); color: #60a5fa;">${item.key}</span>
                    </div>
                    <div style="font-size: 11px; font-family: monospace; color: var(--admin-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.urls.join(', ')}
                    </div>
                </div>`;
            }).join('');
        }
    }

    if (jsContainer) {
        if (jsItems.length === 0) {
            jsContainer.innerHTML = '<div style="font-size: 12.5px; color: var(--admin-text-muted); padding: 12px; background: var(--admin-bg-surface); border: 1px dashed var(--admin-border); border-radius: var(--radius-md); text-align: center;">No third-party JS script dependencies required for this section.</div>';
        } else {
            jsContainer.innerHTML = jsItems.map(function (item) {
                return `
                <div style="display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; background: var(--admin-bg-surface); border: 1px solid var(--admin-border); border-radius: var(--radius-md);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--admin-text); font-size: 13px;">
                            <span class="material-symbols-outlined" style="font-size: 16px; color: #34d399;">integration_instructions</span> ${item.name}
                        </div>
                        <span class="badge-pill" style="font-size: 10px; padding: 2px 6px; background: rgba(16, 185, 129, 0.15); color: #34d399;">${item.key}</span>
                    </div>
                    <div style="font-size: 11px; font-family: monospace; color: var(--admin-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.urls.join(', ')}
                    </div>
                </div>`;
            }).join('');
        }
    }
}

/**
 * Handles manual code changes in HTML/CSS/JS textareas or CodeMirror instances.
 */
function handleCodeManualEdit(type) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    if (type === 'html') {
        sec.htmlTemplate = cmEditorHtml ? cmEditorHtml.getValue() : (document.getElementById('editorHtmlCode')?.value || '');
    } else if (type === 'css') {
        sec.scopedCss = cmEditorCss ? cmEditorCss.getValue() : (document.getElementById('editorCssCode')?.value || '');
    } else if (type === 'js') {
        sec.jsScript = cmEditorJs ? cmEditorJs.getValue() : (document.getElementById('editorJsCode')?.value || '');
    }

    markUnsavedChanges();
    debounceLivePreview();
}

/**
 * Handles manual edits in the Mock JSON textarea or CodeMirror instance.
 */
function handleMockJsonManualEdit() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    var val = cmEditorMock ? cmEditorMock.getValue() : (document.getElementById('editorMockJsonCode')?.value || '');
    sec.sampleContentJson = val;

    markUnsavedChanges();
    debounceLivePreview();
}

/**
 * Debounce helper for instant live preview updates.
 */
function debounceLivePreview() {
    if (liveRenderDebounceTimer) clearTimeout(liveRenderDebounceTimer);
    liveRenderDebounceTimer = setTimeout(function () {
        if (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections[activePreviewIndex]) {
            refreshSandboxPreview(rawExtractionData.sections[activePreviewIndex]);
        }
    }, 200);
}

/**
 * Comprehensive Client-Side Mustache Hydration Engine.
 * Expands SectionLists repeater arrays, PageCategories menu loops, Brand tokens, and scalar fields.
 */
function hydrateMustacheHtml(template, mockJson) {
    if (typeof SectionCompilerRenderer !== 'undefined' && SectionCompilerRenderer.hydrateTemplate) {
        return SectionCompilerRenderer.hydrateTemplate(template, mockJson);
    }
    return template || '';
}

/**
 * Re-renders the preview iframe with token hydration, theme variables, and resolved library CDNs.
 */
function refreshSandboxPreview(sec) {
    var iframe = document.getElementById('previewSandboxFrame');
    if (!iframe || !sec) return;

    var suiteCssUrl = rawExtractionData ? (rawExtractionData.suiteCompiledCssUrl || rawExtractionData.suite_compiled_css_url || '') : '';
    var options = {
        canvasTheme: activePreviewCanvasTheme,
        suiteCompiledCssUrl: suiteCssUrl
    };

    if (typeof SectionCompilerRenderer !== 'undefined' && SectionCompilerRenderer.compileSectionDocument) {
        iframe.srcdoc = SectionCompilerRenderer.compileSectionDocument(sec, options);
    } else {
        iframe.srcdoc = `<!DOCTYPE html><html><body><main>${sec.htmlTemplate || ''}</main></body></html>`;
    }
}

/**
 * Set preview viewport width.
 */
function setPreviewViewport(width, btn) {
    var frame = document.getElementById('previewSandboxFrame');
    if (frame) frame.style.width = width;

    document.querySelectorAll('#vpBtnDesktop, #vpBtnTablet, #vpBtnMobile').forEach(function (b) {
        b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
}

/**
 * Switch modal tabs (Preview, HTML, Scoped CSS, JS, Mock Data, CSS Libraries, JS Libraries, AI Studio).
 */
function switchInspectorTab(tab) {
    var tabs = ['preview', 'html', 'css', 'js', 'mock', 'csslibs', 'jslibs', 'ai'];

    tabs.forEach(function (t) {
        var btn = document.getElementById('inspTab' + t.charAt(0).toUpperCase() + t.slice(1));
        var panel = document.getElementById('inspectorPanel' + t.charAt(0).toUpperCase() + t.slice(1));

        if (btn) {
            if (t === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        if (panel) {
            if (t === tab) {
                panel.style.display = (t === 'preview' || t === 'html' || t === 'css' || t === 'js' || t === 'mock' || t === 'ai') ? 'flex' : 'block';
            } else {
                panel.style.display = 'none';
            }
        }
    });

    // Refresh active CodeMirror instance when visible so line numbers & folding render cleanly
    setTimeout(function () {
        if (tab === 'html' && cmEditorHtml) cmEditorHtml.refresh();
        if (tab === 'css' && cmEditorCss) cmEditorCss.refresh();
        if (tab === 'js' && cmEditorJs) cmEditorJs.refresh();
        if (tab === 'mock' && cmEditorMock) cmEditorMock.refresh();
    }, 20);

    // If switching to Preview tab, re-render sandbox iframe with current state
    if (tab === 'preview' && rawExtractionData && rawExtractionData.sections && rawExtractionData.sections[activePreviewIndex]) {
        refreshSandboxPreview(rawExtractionData.sections[activePreviewIndex]);
    }
}

/**
 * Save manual draft edits directly to the database staging table (`MasterMarketplaceDraftSections`).
 */
async function saveDraftEditsToDatabase() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];

    // Ensure latest editor values are stored
    if (cmEditorHtml) sec.htmlTemplate = cmEditorHtml.getValue();
    if (cmEditorCss) sec.scopedCss = cmEditorCss.getValue();
    if (cmEditorJs) sec.jsScript = cmEditorJs.getValue();
    if (cmEditorMock) sec.sampleContentJson = cmEditorMock.getValue();

    var statusBadge = document.getElementById('previewModalStatusBadge');

    if (statusBadge) {
        statusBadge.textContent = 'Saving to DB...';
        statusBadge.className = 'badge-pill badge-pill-warning';
    }

    var payload = {
        id: (sec.id && sec.id !== '0' && sec.id !== 0) ? sec.id : null,
        name: sec.name,
        categoryKey: sec.categoryKey,
        description: sec.description,
        htmlTemplate: sec.htmlTemplate,
        scopedCss: sec.scopedCss,
        jsScript: sec.jsScript,
        sampleContentJson: sec.sampleContentJson,
        requiredLibrariesJson: JSON.stringify(sec.requiredLibraries || [])
    };

    var token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

    try {
        var resp = await fetch('?handler=UpdateDraftSection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload)
        });
        var result = await resp.json();

        if (result.success) {
            clearUnsavedChanges();
            if (statusBadge) {
                statusBadge.textContent = 'Saved to DB';
                statusBadge.className = 'badge-pill badge-pill-success';
            }
            // Update workbench cards
            renderWorkbenchSections(rawExtractionData);
        } else {
            alert('Failed to save draft to database: ' + (result.message || 'Unknown error.'));
            if (statusBadge) {
                statusBadge.textContent = 'Save Failed';
                statusBadge.className = 'badge-pill badge-pill-danger';
            }
        }
    } catch (err) {
        console.error(err);
        alert('Network error saving draft.');
        if (statusBadge) {
            statusBadge.textContent = 'Save Failed';
            statusBadge.className = 'badge-pill badge-pill-danger';
        }
    }
}

/**
 * Background silent draft save for non-intrusive operations.
 */
async function saveDraftEditsToDatabaseSilently(index) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[index]) return;

    var sec = rawExtractionData.sections[index];
    var payload = {
        id: (sec.id && sec.id !== '0' && sec.id !== 0) ? sec.id : null,
        name: sec.name,
        categoryKey: sec.categoryKey,
        description: sec.description,
        htmlTemplate: sec.htmlTemplate,
        scopedCss: sec.scopedCss,
        jsScript: sec.jsScript,
        sampleContentJson: sec.sampleContentJson,
        requiredLibrariesJson: JSON.stringify(sec.requiredLibraries || [])
    };

    var token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

    try {
        await fetch('?handler=UpdateDraftSection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload)
        });
    } catch (e) { }
}

/**
 * Conversational AI Studio Section Refiner
 * Sends section code payload to AI, rewrites HTML/CSS/tokens, updates staging DB row, and refreshes preview.
 */
async function executeAiRefineOnCurrentSection() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    var promptInput = document.getElementById('aiRefineInputPrompt');
    var prompt = promptInput ? promptInput.value.trim() : '';

    if (!prompt) {
        alert('Please enter an AI refinement instruction (e.g., "Add dark mode styling and make buttons rounded").');
        return;
    }

    var btn = document.getElementById('btnExecuteAiRefine');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite; font-size: 15px;">sync</span> Refining with AI...';
    }

    showStudioLoading('Updating Section with AI...', 'Applying your changes, polishing styles, and refreshing your preview.');

    var payload = {
        id: (sec.id && sec.id !== '0' && sec.id !== 0) ? String(sec.id) : null,
        section_key: sec.variantCode || 'sec',
        category_key: sec.categoryKey || 'bodysections',
        title: sec.name || 'Section',
        html_template: sec.htmlTemplate,
        raw_css: sec.scopedCss,
        raw_js: sec.jsScript,
        user_prompt: prompt,
        provider: 'Gemini'
    };

    var token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

    try {
        var resp = await fetch('?handler=CleanSectionWithAi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload)
        });
        var result = await resp.json();
        hideStudioLoading();

        if (result.success && result.data) {
            // Update in-memory draft with AI refined response
            sec.htmlTemplate = result.data.htmlTemplate || result.data.html_template || sec.htmlTemplate;
            sec.scopedCss = result.data.scopedCss || result.data.scoped_css || sec.scopedCss;
            sec.jsScript = result.data.jsScript || result.data.js_script || sec.jsScript;
            sec.sampleContentJson = result.data.sampleContentJson || result.data.sample_content_json || sec.sampleContentJson;

            // Re-open preview modal to refresh inspector editors and iframe
            openSectionPreviewModal(activePreviewIndex);

            if (promptInput) promptInput.value = '';
            alert('AI Refinement completed: ' + (result.data.explanation || 'Section updated and saved to database.'));
        } else if (result.success && result.html_template) {
            sec.htmlTemplate = result.html_template;
            sec.scopedCss = result.scoped_css;
            sec.jsScript = result.js_script;
            sec.sampleContentJson = result.sample_content_json;

            openSectionPreviewModal(activePreviewIndex);
            if (promptInput) promptInput.value = '';
            alert('AI Refinement completed: ' + (result.explanation || 'Section updated and saved to database.'));
        } else {
            alert('AI Refinement failed: ' + (result.message || 'Unknown error.'));
        }
    } catch (err) {
        hideStudioLoading();
        console.error(err);
        alert('Error connecting to AI service.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined">auto_fix_high</span> Execute AI Refinement';
        }
    }
}

/**
 * Direct publish single section from workbench card or table row.
 */
async function publishSingleSectionDirect(index) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[index]) return;

    var sec = rawExtractionData.sections[index];
    var btnCard = document.getElementById('btnPublishCard_' + index);
    var btnRow = document.getElementById('btnPublishRow_' + index);

    [btnCard, btnRow].forEach(function (btn) {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite; font-size: 15px;">sync</span>';
        }
    });

    var payload = {
        draftId: (sec.id && sec.id !== '0' && sec.id !== 0) ? sec.id : null,
        name: sec.name,
        variantCode: sec.variantCode,
        categoryKey: sec.categoryKey || 'bodysections',
        htmlTemplate: sec.htmlTemplate,
        cssStyles: sec.scopedCss,
        jsScript: sec.jsScript,
        defaultSectionListsJson: sec.sampleContentJson,
        description: sec.description
    };

    var token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

    try {
        var resp = await fetch('?handler=PublishSection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload)
        });
        var result = await resp.json();

        if (result.success) {
            [btnCard, btnRow].forEach(function (btn) {
                if (btn) {
                    btn.className = 'btn-admin btn-admin-success btn-admin-sm';
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px;">check_circle</span> Published';
                }
            });
            alert(`"${sec.name}" published successfully to Marketplace!`);
        } else {
            alert('Publishing failed: ' + (result.message || 'Unknown error.'));
            [btnCard, btnRow].forEach(function (btn) {
                if (btn) {
                    btn.disabled = false;
                    btn.className = 'btn-admin btn-admin-primary btn-admin-sm';
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px;">cloud_upload</span> Publish';
                }
            });
        }
    } catch (err) {
        console.error(err);
        alert('Error publishing section.');
        [btnCard, btnRow].forEach(function (btn) {
            if (btn) {
                btn.disabled = false;
                btn.className = 'btn-admin btn-admin-primary btn-admin-sm';
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px;">cloud_upload</span> Publish';
            }
        });
    }
}

/**
 * Publish from preview modal.
 */
async function publishCurrentSectionToMarketplace() {
    await publishSingleSectionDirect(activePreviewIndex);
}

/**
 * Batch publish all extracted sections to marketplace catalog.
 */
async function publishAllSectionsToMarketplace() {
    if (!rawExtractionData || !rawExtractionData.sections || rawExtractionData.sections.length === 0) {
        alert('No extracted sections available to publish.');
        return;
    }

    if (!confirm(`Are you sure you want to batch-publish all ${rawExtractionData.sections.length} modular sections to the marketplace catalog?`)) {
        return;
    }

    showStudioLoading('Publishing Sections to Marketplace...', `Saving ${rawExtractionData.sections.length} sections to your catalog.`);

    var payload = {
        suiteName: rawExtractionData.suiteName || rawExtractionData.suite_name || 'Imported Suite',
        sections: rawExtractionData.sections.map(function (sec) {
            return {
                draftId: (sec.id && sec.id !== '0' && sec.id !== 0) ? sec.id : null,
                name: sec.name,
                variantCode: sec.variantCode,
                categoryKey: sec.categoryKey || 'bodysections',
                htmlTemplate: sec.htmlTemplate,
                cssStyles: sec.scopedCss,
                jsScript: sec.jsScript,
                defaultSectionListsJson: sec.sampleContentJson,
                description: sec.description
            };
        })
    };

    var token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

    try {
        var resp = await fetch('?handler=PublishAllSuiteSections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload)
        });
        var result = await resp.json();
        hideStudioLoading();

        if (result.success) {
            alert(`Suite successfully published! ${result.publishedCount || rawExtractionData.sections.length} sections are now available in the marketplace.`);
            window.location.href = '/centralwks/templates';
        } else {
            alert('Batch publishing failed: ' + (result.message || 'Unknown error.'));
        }
    } catch (err) {
        hideStudioLoading();
        console.error(err);
        alert('Error during batch publishing.');
    }
}
