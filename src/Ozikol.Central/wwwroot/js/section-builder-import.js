/**
 * section-builder-import.js
 * 5-Step Unified Section Builder & Extractor Studio Controller.
 * 
 * Steps:
 * 1. Input Source & URL Target (Upload/Paste HTML + Target URL)
 * 2. Raw Code & Asset Inspection Workbench (HTML, CSS files list & editor, JS, Fonts)
 * 3. Modular Section Slicing & Precision Scoped CSS Extraction
 * 4. Multi-Device Live Preview Sandbox (Desktop, Tablet, Mobile)
 * 5. Marketplace Installation (Individual & Batch Suite Publishing)
 */

var rawInspectionData = null;
var rawExtractionData = null;
var currentWbCssIndex = 0;
var activePreviewIndex = 0;
var currentSelectedCat = 'all';
var currentSelectedPage = 'all';
var discoveredPagesData = [];

// Initialize data from server JSON containers on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    // 1. Check for Step 2 Inspection Data
    var inspectJsonEl = document.getElementById('rawInspectionJsonData');
    if (inspectJsonEl && inspectJsonEl.textContent) {
        var inspText = inspectJsonEl.textContent.trim();
        if (inspText && inspText !== 'null') {
            try {
                rawInspectionData = JSON.parse(inspText);
                initWorkbench(rawInspectionData);
            } catch (e) {
                console.error('[SectionBuilder] Failed to parse inspection JSON:', e);
            }
        }
    }

    // 2. Check for Step 3/4 Extraction Data
    var extractJsonEl = document.getElementById('rawExtractionJsonData');
    if (extractJsonEl && extractJsonEl.textContent) {
        var extText = extractJsonEl.textContent.trim();
        if (extText && extText !== 'null') {
            try {
                rawExtractionData = JSON.parse(extText);
                if (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections.length > 0) {
                    jumpToStep(3);
                }
            } catch (e) {
                console.error('[SectionBuilder] Failed to parse extraction result JSON:', e);
            }
        }
    }

    updateHtmlCharCount();
});

/**
 * Jump to specific studio step (1: Input Source, 2: Modular Section Workbench, 3: Live Preview Modal).
 */
function jumpToStep(step) {
    var p1 = document.getElementById('stepPanel1');
    var p2 = document.getElementById('stepPanel2');
    var p3 = document.getElementById('stepPanel3');

    if (step === 1) {
        if (p1) p1.style.display = 'block';
        if (p2) p2.style.display = 'none';
        if (p3) p3.style.display = 'none';
    } else if (step === 2) {
        var hasSectionsInDom = document.querySelectorAll('.section-card-col').length > 0;
        var hasExtractionData = rawExtractionData && rawExtractionData.sections && rawExtractionData.sections.length > 0;
        if (!hasSectionsInDom && !hasExtractionData) {
            alert('Please provide an input source (HTML, URL, or Screenshot) to generate modular sections.');
            jumpToStep(1);
            return;
        }
        if (p1) p1.style.display = 'none';
        if (p2) p2.style.display = 'none';
        if (p3) p3.style.display = 'block';
    } else if (step >= 3) {
        var hasSections = (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections.length > 0) || document.querySelectorAll('.section-card-col').length > 0;
        if (hasSections) {
            openSectionPreviewModal(activePreviewIndex || 0);
        } else {
            alert('Please extract modular sections first.');
            jumpToStep(1);
            return;
        }
    }

    // Update stepper pills
    document.querySelectorAll('.step-pill').forEach(function (pill, idx) {
        var stepNum = idx + 1;
        pill.classList.remove('active');
        if (stepNum === step) {
            pill.classList.add('active');
        }
    });
}

/**
 * Switches between "Paste Page Source / HTML", "Live Website URL", and "UI Mockup Image" tabs in Step 1.
 */
function switchImportTab(tabName) {
    var panelUrl = document.getElementById('panelUrlExtractor');
    var panelSource = document.getElementById('panelSourceExtractor');
    var panelImage = document.getElementById('panelImageExtractor');
    var btnUrl = document.getElementById('tabBtnUrl');
    var btnSource = document.getElementById('tabBtnSource');
    var btnImage = document.getElementById('tabBtnImage');

    if (panelUrl) panelUrl.style.display = 'none';
    if (panelSource) panelSource.style.display = 'none';
    if (panelImage) panelImage.style.display = 'none';

    if (btnUrl) btnUrl.classList.remove('active');
    if (btnSource) btnSource.classList.remove('active');
    if (btnImage) btnImage.classList.remove('active');

    if (tabName === 'source') {
        if (panelSource) panelSource.style.display = 'block';
        if (btnSource) btnSource.classList.add('active');
    } else if (tabName === 'image') {
        if (panelImage) panelImage.style.display = 'block';
        if (btnImage) btnImage.classList.add('active');
    } else {
        if (panelUrl) panelUrl.style.display = 'block';
        if (btnUrl) btnUrl.classList.add('active');
    }
}

/**
 * Handles image selection for Gemini Vision Decomposition.
 */
function handleImageFileSelect(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var previewBox = document.getElementById('imageSelectedPreview');
    var previewImg = document.getElementById('imagePreviewImg');
    var previewName = document.getElementById('imagePreviewName');
    var previewSize = document.getElementById('imagePreviewSize');

    if (previewName) previewName.innerText = file.name;
    if (previewSize) previewSize.innerText = Math.round(file.size / 1024) + ' KB';

    var reader = new FileReader();
    reader.onload = function (e) {
        if (previewImg) previewImg.src = e.target.result;
        if (previewBox) previewBox.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function clearSelectedImage(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var input = document.getElementById('imageMockupFileInput');
    if (input) input.value = '';
    var previewBox = document.getElementById('imageSelectedPreview');
    if (previewBox) previewBox.style.display = 'none';
    var previewImg = document.getElementById('imagePreviewImg');
    if (previewImg) previewImg.src = '';
}

function showImageVisionLoading(event) {
    var form = document.getElementById('extractImageForm');
    if (form) {
        if (form.getAttribute('data-submitting') === 'true') {
            if (event) event.preventDefault();
            return false;
        }
        form.setAttribute('data-submitting', 'true');
    }

    var btn = document.getElementById('btnExtractImageAction');
    if (btn) {
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span> <span>Analyzing &amp; Decomposing UI...</span>';
    }

    var loader = document.getElementById('slicingLoadingState');
    if (loader) {
        var h3 = loader.querySelector('h3');
        var p = loader.querySelector('p');
        if (h3) h3.innerText = 'Analyzing UI Screenshot with Gemini Vision AI...';
        if (p) p.innerText = 'Decomposing visual components into modular sections, generating isolated scoped CSS, and creating dynamic placeholders.';
        loader.style.display = 'block';
        loader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
}

/**
 * Reads user-selected .html file from local disk and populates the source textarea.
 */
function handleSourceFileUpload(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
        var content = e.target.result;
        var textarea = document.getElementById('inputHtmlSource');
        if (textarea) {
            textarea.value = content;
            textarea.focus();
        }
    };
    reader.readAsText(file);
}

/**
 * Step 2: Initializes the Raw Code & Asset Inspection Workbench.
 */
function initWorkbench(data) {
    if (!data) return;

    // 1. Sync hidden form inputs for Step 3 Slice & Scope
    var htmlSrc = data.htmlSource || data.html_source || '';
    var baseU = data.baseUrl || data.base_url || '';
    var suiteN = data.suiteName || data.suite_name || '';
    var brandN = data.brandName || data.brand_name || '';

    var formHtml = document.getElementById('wbFormHtmlSource');
    var formEditedHtml = document.getElementById('wbFormEditedHtmlSource');
    var formBase = document.getElementById('wbFormSourceBaseUrl');
    var formSuite = document.getElementById('wbFormSourceSuiteName');
    var formBrand = document.getElementById('wbFormSourceBrandName');
    var formStylesheets = document.getElementById('wbFormEditedStylesheetsJson');

    if (formHtml) formHtml.value = htmlSrc;
    if (formEditedHtml) formEditedHtml.value = htmlSrc;
    if (formBase) formBase.value = baseU;
    if (formSuite) formSuite.value = suiteN;
    if (formBrand) formBrand.value = brandN;

    var stylesheets = data.stylesheets || [];
    if (formStylesheets) {
        formStylesheets.value = JSON.stringify(stylesheets);
    }

    // 2. Populate CSS tab title & list
    var cssTabTitle = document.getElementById('wbCssTabTitle');
    if (cssTabTitle) {
        cssTabTitle.innerText = 'CSS Stylesheets (' + stylesheets.length + ')';
    }

    var cssFilesContainer = document.getElementById('wbCssFilesList');
    if (cssFilesContainer) {
        cssFilesContainer.innerHTML = '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; padding: 6px 10px; font-weight: 700;">Downloaded Stylesheets (' + stylesheets.length + ')</div>';
        
        stylesheets.forEach(function (s, idx) {
            var name = s.name || ('stylesheet_' + (idx + 1) + '.css');
            var sizeKb = s.sizeKb || s.size_kb || 0;
            var content = s.content || '';
            var lineCount = content ? content.split('\n').length : 0;
            var activeClass = (idx === 0) ? 'active' : '';

            var itemHtml = '<div class="css-file-pill ' + activeClass + '" id="cssPill_' + idx + '" onclick="selectCssFile(' + idx + ')">' +
                '<span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 155px;" title="' + escapeHtmlAttr(name) + '">' + escapeHtml(name) + '</span>' +
                '<span style="background: rgba(255,255,255,0.15); font-size: 10px; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">' + sizeKb + ' KB • ' + lineCount + ' L</span>' +
            '</div>';
            cssFilesContainer.innerHTML += itemHtml;
        });
    }

    // Select first CSS file by default
    if (stylesheets.length > 0) {
        selectCssFile(0);
    }

    // 3. Populate JS Scripts Tab (Split-View Inspector & Code Editor)
    var scripts = data.scripts || [];
    var jsTabTitle = document.getElementById('wbJsTabTitle');
    if (jsTabTitle) {
        jsTabTitle.innerText = 'JS Scripts (' + scripts.length + ')';
    }

    var jsFilesContainer = document.getElementById('wbJsFilesList');
    if (jsFilesContainer) {
        jsFilesContainer.innerHTML = '<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; padding: 6px 10px; font-weight: 700;">Detected JavaScripts (' + scripts.length + ')</div>';
        
        if (scripts.length === 0) {
            jsFilesContainer.innerHTML += '<div style="color: #94a3b8; font-size: 12px; padding: 10px;">No scripts detected.</div>';
        } else {
            scripts.forEach(function (sc, idx) {
                var rawName = sc.name || ('script_' + (idx + 1) + '.js');
                var scName = rawName.replace(/\.download$/i, '').replace(/^.*?[_ -]files[\/\\]/i, '');
                var sizeKb = sc.sizeKb || sc.size_kb || 0;
                var content = sc.content || '';
                var lineCount = content ? content.split('\n').length : 0;
                var activeClass = (idx === 0) ? 'active' : '';

                var itemHtml = '<div class="js-file-pill ' + activeClass + '" id="jsPill_' + idx + '" onclick="selectJsFile(' + idx + ')">' +
                    '<span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 155px;" title="' + escapeHtmlAttr(scName) + '">' + escapeHtml(scName) + '</span>' +
                    '<span style="background: rgba(234, 179, 8, 0.2); color: #fde047; font-size: 10px; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">' + sizeKb + ' KB • ' + lineCount + ' L</span>' +
                '</div>';
                jsFilesContainer.innerHTML += itemHtml;
            });
        }
    }

    // Select first JS script by default
    if (scripts.length > 0) {
        selectJsFile(0);
    }

    // 4. Populate Fonts Tab
    var fonts = data.fonts || [];
    var fontsTabTitle = document.getElementById('wbFontsTabTitle');
    if (fontsTabTitle) {
        fontsTabTitle.innerText = 'Font & Icon CDNs (' + fonts.length + ')';
    }
    var fontsContainer = document.getElementById('wbFontsContainer');
    if (fontsContainer) {
        fontsContainer.innerHTML = '';
        if (fonts.length === 0) {
            fontsContainer.innerHTML = '<div style="color: #94a3b8; font-size: 13px;">Google Fonts and Icon CDNs will be automatically detected and injected into each section during slicing.</div>';
        } else {
            fonts.forEach(function (f) {
                fontsContainer.innerHTML += '<div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">' +
                    '<span class="material-symbols-outlined" style="color: #6ee7b7; font-size: 20px;">font_download</span>' +
                    '<span style="font-size: 13px; color: #f8fafc; font-family: monospace;">' + escapeHtml(f) + '</span>' +
                '</div>';
            });
        }
    }
}

/**
 * Switches between sub-tabs in the Step 2 Workbench.
 */
function switchWorkbenchTab(tabKey) {
    document.querySelectorAll('.wb-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.wb-pane').forEach(function (p) { p.style.display = 'none'; });

    var targetBtn = document.getElementById('wbTab_' + tabKey);
    var targetPane = document.getElementById('wbPane_' + tabKey);

    if (targetBtn) targetBtn.classList.add('active');
    if (targetPane) targetPane.style.display = 'block';
}

/**
 * Selects an individual CSS file from the sidebar list in Step 2.
 */
function selectCssFile(index) {
    currentWbCssIndex = index;
    document.querySelectorAll('.css-file-pill').forEach(function (p) { p.classList.remove('active'); });
    var activePill = document.getElementById('cssPill_' + index);
    if (activePill) activePill.classList.add('active');

    if (!rawInspectionData || !rawInspectionData.stylesheets || !rawInspectionData.stylesheets[index]) return;

    var item = rawInspectionData.stylesheets[index];
    var nameEl = document.getElementById('wbCurrentCssFileName');
    var sizeEl = document.getElementById('wbCurrentCssSize');
    var editor = document.getElementById('wbCssEditor');

    var content = item.content || '';
    var lines = content ? content.split('\n').length : 0;
    var rules = (content.match(/\{/g) || []).length;
    var props = (content.match(/[\w-]+\s*:\s*[^;]+;/g) || []).length;
    var sizeKb = item.sizeKb || item.size_kb || Math.round(content.length / 1024);

    if (nameEl) nameEl.innerText = item.name || 'stylesheet.css';
    if (sizeEl) {
        sizeEl.innerHTML = '<span style="color: #38bdf8; font-weight: 600;">' + sizeKb + ' KB</span> &bull; ' +
                           '<span>' + lines.toLocaleString() + ' lines</span> &bull; ' +
                           '<span>' + rules.toLocaleString() + ' rules</span> &bull; ' +
                           '<span style="color: #a78bfa;">' + props.toLocaleString() + ' properties</span>';
    }
    if (editor) editor.value = content;
}

/**
 * Syncs real-time HTML edits made in Step 2.
 */
function handleWbHtmlChange() {
    var editor = document.getElementById('wbHtmlEditor');
    var hiddenEdited = document.getElementById('wbFormEditedHtmlSource');
    if (editor && hiddenEdited) {
        hiddenEdited.value = editor.value;
    }
    updateHtmlCharCount();
}

/**
 * Syncs real-time CSS edits for the selected stylesheet in Step 2.
 */
function handleWbCssChange() {
    var editor = document.getElementById('wbCssEditor');
    if (!editor || !rawInspectionData || !rawInspectionData.stylesheets) return;

    if (rawInspectionData.stylesheets[currentWbCssIndex]) {
        var content = editor.value;
        rawInspectionData.stylesheets[currentWbCssIndex].content = content;
        var hiddenStylesheets = document.getElementById('wbFormEditedStylesheetsJson');
        if (hiddenStylesheets) {
            hiddenStylesheets.value = JSON.stringify(rawInspectionData.stylesheets);
        }

        // Live update CSS header metrics and sidebar pill badge
        var lines = content ? content.split('\n').length : 0;
        var rules = (content.match(/\{/g) || []).length;
        var props = (content.match(/[\w-]+\s*:\s*[^;]+;/g) || []).length;
        var sizeKb = Math.round(content.length / 1024);

        var sizeEl = document.getElementById('wbCurrentCssSize');
        if (sizeEl) {
            sizeEl.innerHTML = '<span style="color: #38bdf8; font-weight: 600;">' + sizeKb + ' KB</span> &bull; ' +
                               '<span>' + lines.toLocaleString() + ' lines</span> &bull; ' +
                               '<span>' + rules.toLocaleString() + ' rules</span> &bull; ' +
                               '<span style="color: #a78bfa;">' + props.toLocaleString() + ' properties</span>';
        }

        var activePill = document.getElementById('cssPill_' + currentWbCssIndex);
        if (activePill) {
            var badge = activePill.querySelector('span:last-child');
            if (badge) badge.innerText = sizeKb + ' KB • ' + lines + ' L';
        }
    }
}

var currentWbJsIndex = 0;

/**
 * Selects an individual JS file from the sidebar list in Step 2 and displays its code in the preview editor.
 */
function selectJsFile(index) {
    currentWbJsIndex = index;
    document.querySelectorAll('.js-file-pill').forEach(function (p) { p.classList.remove('active'); });
    var activePill = document.getElementById('jsPill_' + index);
    if (activePill) activePill.classList.add('active');

    if (!rawInspectionData || !rawInspectionData.scripts || !rawInspectionData.scripts[index]) return;

    var item = rawInspectionData.scripts[index];
    var nameEl = document.getElementById('wbCurrentJsFileName');
    var sizeEl = document.getElementById('wbCurrentJsSize');
    var urlEl = document.getElementById('wbCurrentJsUrl');
    var editor = document.getElementById('wbJsEditor');

    var rawName = item.name || 'script.js';
    var scName = rawName.replace(/\.download$/i, '').replace(/^.*?[_ -]files[\/\\]/i, '');
    var scUrl = (item.url || 'Inline Script').replace(/\.download$/i, '');
    var content = item.content || ('// Script Reference: ' + scUrl + '\n// Note: This script is configured for high-availability CDN or base asset execution.');
    var lines = content ? content.split('\n').length : 0;
    var funcs = (content.match(/\bfunction\b|\=\>\s*\{/g) || []).length;
    var sizeKb = item.sizeKb || item.size_kb || Math.round(content.length / 1024);

    if (nameEl) nameEl.innerText = scName;
    if (sizeEl) {
        sizeEl.innerHTML = '<span style="color: #fde047; font-weight: 600;">' + sizeKb + ' KB</span> &bull; ' +
                           '<span>' + lines.toLocaleString() + ' lines</span>' +
                           (funcs > 0 ? ' &bull; <span>' + funcs.toLocaleString() + ' functions</span>' : '');
    }
    if (urlEl) urlEl.innerText = scUrl;
    if (editor) {
        editor.value = content;
    }
}

/**
 * Syncs real-time JS edits for the selected script in Step 2.
 */
function handleWbJsChange() {
    var editor = document.getElementById('wbJsEditor');
    if (!editor || !rawInspectionData || !rawInspectionData.scripts) return;

    if (rawInspectionData.scripts[currentWbJsIndex]) {
        var content = editor.value;
        rawInspectionData.scripts[currentWbJsIndex].content = content;

        var lines = content ? content.split('\n').length : 0;
        var funcs = (content.match(/\bfunction\b|\=\>\s*\{/g) || []).length;
        var sizeKb = Math.round(content.length / 1024);

        var sizeEl = document.getElementById('wbCurrentJsSize');
        if (sizeEl) {
            sizeEl.innerHTML = '<span style="color: #fde047; font-weight: 600;">' + sizeKb + ' KB</span> &bull; ' +
                               '<span>' + lines.toLocaleString() + ' lines</span>' +
                               (funcs > 0 ? ' &bull; <span>' + funcs.toLocaleString() + ' functions</span>' : '');
        }

        var activePill = document.getElementById('jsPill_' + currentWbJsIndex);
        if (activePill) {
            var badge = activePill.querySelector('span:last-child');
            if (badge) badge.innerText = sizeKb + ' KB • ' + lines + ' L';
        }
    }
}

function updateHtmlCharCount() {
    var editor = document.getElementById('wbHtmlEditor');
    var countEl = document.getElementById('wbHtmlCharCount');
    if (editor && countEl) {
        var count = editor.value.length;
        var lines = editor.value ? editor.value.split('\n').length : 0;
        countEl.innerHTML = '<span>' + lines.toLocaleString() + ' lines</span> &bull; <span>' + count.toLocaleString() + ' characters</span>';
    }
}

function showInspectionLoading(event) {
    var form = document.getElementById('inspectAssetsForm');
    if (form) {
        if (form.getAttribute('data-submitting') === 'true') {
            if (event) event.preventDefault();
            return false;
        }
        form.setAttribute('data-submitting', 'true');
    }

    var btn = document.getElementById('btnFetchInspectAssets');
    if (btn) {
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span> <span>Fetching Code &amp; Assets...</span>';
    }
    return true;
}

function showSlicingLoading(event) {
    var form = document.getElementById('sliceAndScopeForm');
    if (form) {
        if (form.getAttribute('data-submitting') === 'true') {
            if (event) event.preventDefault();
            return false;
        }
        form.setAttribute('data-submitting', 'true');
    }

    var loader = document.getElementById('slicingLoadingState');
    if (loader) {
        var h3 = loader.querySelector('h3');
        var p = loader.querySelector('p');
        if (h3) h3.innerText = 'Slicing Modular Sections & Scoping CSS...';
        if (p) p.innerText = 'Decomposing the confirmed HTML markup, matching class-specific CSS rules, injecting typography CDN fonts, and preparing live sandbox previews.';
        loader.style.display = 'block';
        loader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    var btn = document.getElementById('btnSliceSectionsAction');
    if (btn) {
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span> <span>Slicing Sections...</span>';
    }
    return true;
}

/**
 * Discovers menu pages for Live URL mode.
 */
function triggerPageDiscovery() {
    var urlInput = document.getElementById('inputTargetUrl');
    if (!urlInput) return;

    var targetUrl = urlInput.value.trim();
    if (!targetUrl) {
        alert('Please enter a target website URL first.');
        urlInput.focus();
        return;
    }

    var btn = document.getElementById('btnDiscoverPages');
    var btnText = document.getElementById('btnDiscoverPagesText');
    if (btn && btnText) {
        btn.disabled = true;
        btnText.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; animation: spin 1s linear infinite; vertical-align: middle;">sync</span> Discovering Menu Pages...';
    }

    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    fetch('/centralwks/templates/import?handler=DiscoverPages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify({ url: targetUrl })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (btn && btnText) {
            btn.disabled = false;
            btnText.innerText = 'Discover Pages from Menu';
        }

        if (data.success && data.pages && data.pages.length > 0) {
            renderDiscoveredPages(data);
        } else {
            alert('Page discovery failed: ' + (data.message || 'No internal pages found in the navigation menu.'));
        }
    })
    .catch(function (err) {
        if (btn && btnText) {
            btn.disabled = false;
            btnText.innerText = 'Discover Pages from Menu';
        }
        alert('Discovery network error: ' + err);
    });
}

function renderDiscoveredPages(data) {
    discoveredPagesData = data.pages || [];
    var container = document.getElementById('discoveredPagesListContainer');
    var card = document.getElementById('discoveredPagesCard');
    var headerTitle = document.getElementById('discoveryHeaderTitle');

    if (!container || !card) return;

    if (headerTitle) {
        headerTitle.innerText = 'Discovered ' + data.totalPages + ' Pages in Navigation Menu';
    }
    container.innerHTML = '';

    discoveredPagesData.forEach(function (p, idx) {
        var isCore = p.is_home || /about|service|feature|price|pricing|contact|blog/i.test(p.slug) || /about|service|contact/i.test(p.title);
        var isChecked = isCore ? 'checked' : '';
        var isHomeBadge = p.is_home ? '<span style="background: #10b981; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">HOME</span>' : '';

        var itemHtml = '<label class="page-item-pill" style="border: 1px solid var(--admin-border, #e2e8f0); background: #ffffff; padding: 10px 14px; border-radius: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer;">' +
            '<input type="checkbox" class="discovered-page-check" data-idx="' + idx + '" data-url="' + escapeHtmlAttr(p.url) + '" ' + isChecked + ' onchange="updateSelectedPagesCount()" style="width: 16px; height: 16px; accent-color: #6366f1; cursor: pointer;" />' +
            '<div style="flex: 1; min-width: 0;">' +
                '<div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">' +
                    '<span style="font-size: 13px; font-weight: 600; color: var(--admin-text, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(p.title) + '</span>' +
                    isHomeBadge +
                '</div>' +
                '<div style="font-size: 11px; color: var(--admin-text-muted, #64748b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace;">' + escapeHtml(p.slug) + '</div>' +
            '</div>' +
        '</label>';

        container.innerHTML += itemHtml;
    });

    card.style.display = 'block';
    updateSelectedPagesCount();
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleAllDiscoveredPages(select) {
    document.querySelectorAll('.discovered-page-check').forEach(function (chk) {
        chk.checked = select;
    });
    updateSelectedPagesCount();
}

function updateSelectedPagesCount() {
    var selectedChecks = document.querySelectorAll('.discovered-page-check:checked');
    var count = selectedChecks.length;
    var countEl = document.getElementById('selectedPagesCountText');
    var btnEl = document.getElementById('btnExtractSelectedPages');

    if (countEl) countEl.innerText = 'Selected ' + count + ' of ' + discoveredPagesData.length + ' pages';
    if (btnEl) btnEl.disabled = (count === 0);
}

function submitExtractionForSelectedPages() {
    var selectedUrls = [];
    document.querySelectorAll('.discovered-page-check:checked').forEach(function (chk) {
        selectedUrls.push(chk.getAttribute('data-url'));
    });

    if (selectedUrls.length === 0) {
        alert('Please select at least one page to extract.');
        return;
    }

    var hiddenInput = document.getElementById('hiddenSelectedPageUrlsJson');
    if (hiddenInput) {
        hiddenInput.value = JSON.stringify(selectedUrls);
    }

    showExtractionLoading();
    var form = document.getElementById('extractForm');
    if (form) form.submit();
}

function showExtractionLoading() {
    var loader = document.getElementById('slicingLoadingState');
    if (loader) loader.style.display = 'block';
}

/**
 * Filter sections by category (all, menu, hero, body, footer, blog, ecommerce, breadcrumb)
 */
function filterByCategory(catKey, btnEl) {
    currentSelectedCat = catKey;
    document.querySelectorAll('.cat-filter-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');
    applyFilters();
}

/**
 * Filter sections by page slug
 */
function filterByPage(pageSlug, btnEl) {
    currentSelectedPage = pageSlug;
    document.querySelectorAll('.page-filter-pill').forEach(function (b) {
        b.style.background = '#ffffff';
        b.style.color = 'var(--admin-text, #334155)';
        b.style.borderColor = 'var(--admin-border, #cbd5e1)';
    });
    if (btnEl) {
        btnEl.style.background = '#0f172a';
        btnEl.style.color = '#ffffff';
        btnEl.style.borderColor = '#0f172a';
    }
    applyFilters();
}

function applyFilters() {
    var cards = document.querySelectorAll('.section-card-col');
    cards.forEach(function (card) {
        var cardCat = card.getAttribute('data-category');
        var cardPages = (card.getAttribute('data-pages') || '').split(',');

        var matchesCat = (currentSelectedCat === 'all' || cardCat === currentSelectedCat);
        var matchesPage = (currentSelectedPage === 'all' || cardPages.includes(currentSelectedPage));

        if (matchesCat && matchesPage) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function selectAllSections(select) {
    document.querySelectorAll('.section-select-check').forEach(function (chk) { chk.checked = select; });
    updateBatchPublishCount();
}

function updateBatchPublishCount() {
    var count = document.querySelectorAll('.section-select-check:checked').length;
    var btn = document.getElementById('btnBatchPublishText');
    if (btn) {
        btn.innerText = 'Publish Selected (' + count + ') to Marketplace';
    }
}

var currentSandboxScope = 'single';
var backupOriginalSectionCode = null;

/**
 * Step 4: Opens the Live Preview Sandbox Modal with scoped CSS, JS, and Viewports.
 */
function openSectionPreviewModal(index) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[index]) {
        console.warn('[SectionBuilder] Section index not found:', index);
        return;
    }

    activePreviewIndex = index;
    currentSandboxScope = 'single';
    backupOriginalSectionCode = null;

    var sec = rawExtractionData.sections[index];
    var name = sec.name || 'Section Preview';
    var categoryKey = sec.categoryKey || sec.category_key || 'body';
    var variantCode = sec.variantCode || sec.variant_code || '';
    var previewIcon = sec.previewIcon || sec.preview_icon || 'view_in_ar';
    var scopedCss = sec.scopedCss || sec.scoped_css || '';
    var secId = sec.id || ('sec_' + index);

    var titleEl = document.getElementById('modalPreviewTitle');
    var subtitleEl = document.getElementById('modalPreviewSubtitle');
    var iconEl = document.getElementById('modalPreviewIcon');

    if (titleEl) titleEl.innerText = name;
    if (subtitleEl) {
        var sizeKb = Math.round((scopedCss || '').length / 1024);
        subtitleEl.innerText = categoryKey.toUpperCase() + ' • ' + variantCode + ' • Scoped CSS (' + sizeKb + ' KB)';
    }
    if (iconEl) iconEl.innerText = previewIcon;

    // Reset scope pills
    document.querySelectorAll('.preview-scope-pill').forEach(function (b) { b.classList.remove('active'); });
    var btnSingle = document.getElementById('scopeBtn_single');
    if (btnSingle) btnSingle.classList.add('active');

    // Reset AI Tweak Card
    var resultCard = document.getElementById('aiTweakResultCard');
    if (resultCard) resultCard.style.display = 'none';

    updateModalCodeBlocks(sec);
    renderSandboxDoc();

    switchPreviewTab('sandbox');
    setPreviewViewport('desktop');

    var btnModalPub = document.getElementById('btnModalPublishAction');
    if (btnModalPub) {
        btnModalPub.onclick = function () {
            var cardBtn = document.getElementById('btnPublish_' + secId);
            publishSingleSection(activePreviewIndex, cardBtn);
        };
    }

    var modalOverlay = document.getElementById('sectionPreviewModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
    }
}

function updateModalCodeBlocks(sec) {
    var blockHtml = document.getElementById('codeBlockHtml');
    var blockCss = document.getElementById('codeBlockCss');
    var blockJs = document.getElementById('codeBlockJs');
    var blockJson = document.getElementById('codeBlockJson');

    var htmlTemplate = sec.htmlTemplate || sec.html_template || '';
    var scopedCss = sec.scopedCss || sec.scoped_css || '';
    var jsScript = sec.jsScript || sec.js_script || '';
    var sampleContentJson = sec.sampleContentJson || sec.sample_content_json || '{}';

    if (blockHtml) blockHtml.innerText = htmlTemplate;
    if (blockCss) blockCss.innerText = scopedCss || '/* Zero extra CSS rules required */';
    if (blockJs) blockJs.innerText = jsScript || '// No interactive script required';
    if (blockJson) blockJson.innerText = sampleContentJson;

    // Calculate line counts, rules, properties, and token counts
    var htmlLines = htmlTemplate ? htmlTemplate.split('\n').length : 0;
    var htmlChars = htmlTemplate.length;

    var cssLines = scopedCss ? scopedCss.split('\n').length : 0;
    var cssRules = (scopedCss.match(/\{/g) || []).length;
    var cssProps = (scopedCss.match(/[\w-]+\s*:\s*[^;]+;/g) || []).length;

    var jsLines = jsScript ? jsScript.split('\n').length : 0;
    var jsonTokens = (sampleContentJson.match(/"\w+":/g) || []).length;

    // Update Tab Badges
    var tabHtml = document.getElementById('tabMetricHtml');
    var tabCss = document.getElementById('tabMetricCss');
    var tabJs = document.getElementById('tabMetricJs');
    var tabJson = document.getElementById('tabMetricJson');

    if (tabHtml) tabHtml.innerText = htmlLines + ' L';
    if (tabCss) tabCss.innerText = cssLines + ' L • ' + cssRules + ' R';
    if (tabJs) tabJs.innerText = jsLines > 0 ? (jsLines + ' L') : '0';
    if (tabJson) tabJson.innerText = jsonTokens + ' T';

    // Update Pane Info Headers
    var infoHtml = document.getElementById('codeHeaderInfoHtml');
    var infoCss = document.getElementById('codeHeaderInfoCss');
    var infoJs = document.getElementById('codeHeaderInfoJs');
    var infoJson = document.getElementById('codeHeaderInfoJson');

    if (infoHtml) {
        infoHtml.innerHTML = '<span>' + htmlLines.toLocaleString() + ' lines</span> &bull; <span>' + htmlChars.toLocaleString() + ' characters</span>';
    }
    if (infoCss) {
        infoCss.innerHTML = '<span>' + cssLines.toLocaleString() + ' lines</span> &bull; <span>' + cssRules.toLocaleString() + ' rules</span> &bull; <span style="color: #a78bfa;">' + cssProps.toLocaleString() + ' properties</span>';
    }
    if (infoJs) {
        infoJs.innerHTML = jsLines > 0 ? ('<span>' + jsLines.toLocaleString() + ' lines</span> &bull; <span style="color: #fde047;">Self-contained section interactive logic</span>') : '<span>0 lines (Pure CSS & HTML section)</span>';
    }
    if (infoJson) {
        infoJson.innerHTML = '<span>' + jsonTokens.toLocaleString() + ' dynamic template tokens</span> &bull; <span>Mustache hydrated</span>';
    }
}

/**
 * Copies code from a code block element to the clipboard and gives visual feedback.
 */
function copyCodeFromBlock(elementId, btnEl) {
    var el = document.getElementById(elementId);
    if (!el) return;

    var text = el.innerText || el.textContent || '';
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            showCopySuccess(btnEl);
        }).catch(function () {
            fallbackCopy(text, btnEl);
        });
    } else {
        fallbackCopy(text, btnEl);
    }
}

function fallbackCopy(text, btnEl) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showCopySuccess(btnEl);
    } catch (e) {
        alert('Could not copy to clipboard');
    }
    document.body.removeChild(ta);
}

function showCopySuccess(btnEl) {
    if (!btnEl) return;
    var origHtml = btnEl.innerHTML;
    btnEl.classList.add('copied');
    btnEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: 14px; color: #34d399;">check</span> Copied!';
    setTimeout(function () {
        btnEl.classList.remove('copied');
        btnEl.innerHTML = origHtml;
    }, 2000);
}

/**
 * Hydrates a Mustache-tokenized HTML template with structured sample data JSON for live preview.
 */
function hydrateMustacheTokens(templateHtml, sampleJsonStr) {
    if (!templateHtml) return '';
    if (!sampleJsonStr) return templateHtml;

    try {
        var data = (typeof sampleJsonStr === 'string') ? JSON.parse(sampleJsonStr) : sampleJsonStr;
        var result = templateHtml;

        // 1. Process Repeater Lists {{#each SectionLists}}...{{/each}}
        var listRegex = /\{\{#each\s+(?:SectionLists|Features|Services|Items)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        result = result.replace(listRegex, function (match, itemTemplate) {
            var list = data.SectionLists || data.Features || data.Services || data.Items || [];
            if (!Array.isArray(list) || list.length === 0) return '';

            var renderedItems = '';
            list.forEach(function (item) {
                var itemHtml = itemTemplate;
                itemHtml = itemHtml.replace(/\{\{\s*Title\s*\}\}/g, item.Title || '');
                itemHtml = itemHtml.replace(/\{\{\s*Description\s*\}\}/g, item.Description || '');
                itemHtml = itemHtml.replace(/\{\{\s*IconClass\s*\}\}/g, item.IconClass || 'material-symbols-outlined');
                itemHtml = itemHtml.replace(/\{\{\s*IconText\s*\}\}/g, item.IconText || 'star');
                itemHtml = itemHtml.replace(/\{\{\s*ImageUrl\s*\}\}/g, item.ImageUrl || '');
                itemHtml = itemHtml.replace(/\{\{\s*ActionUrl\s*\}\}/g, item.ActionUrl || '#');
                itemHtml = itemHtml.replace(/\{\{\s*ActionText\s*\}\}/g, item.ActionText || 'Learn More');
                renderedItems += itemHtml;
            });
            return renderedItems;
        });

        // 2. Replace Single Value Tokens
        result = result.replace(/\{\{\s*Title\s*\}\}/g, data.Title || 'Modular Section Title');
        result = result.replace(/\{\{\s*MiniTitle\s*\}\}/g, data.MiniTitle || 'Featured Capability');
        result = result.replace(/\{\{\s*FullDescription\s*\}\}/g, data.FullDescription || data.Description || '');
        result = result.replace(/\{\{\s*Description\s*\}\}/g, data.Description || data.FullDescription || '');
        result = result.replace(/\{\{\s*ActionText\s*\}\}/g, data.ActionText || 'Explore Features');
        result = result.replace(/\{\{\s*ActionUrl\s*\}\}/g, data.ActionUrl || '#');
        result = result.replace(/\{\{\s*ImageUrl\s*\}\}/g, data.ImageUrl || '');
        result = result.replace(/\{\{\s*ImageAlt\s*\}\}/g, data.ImageAlt || 'Section Visual');

        // 3. Replace Organization tokens
        var org = data.Organization || {};
        result = result.replace(/\{\{\s*Organization\.Name\s*\}\}/g, org.Name || 'Enterprise Workspace');
        result = result.replace(/\{\{\s*Organization\.Phone\s*\}\}/g, org.Phone || '+0 (000) 000-0000');
        result = result.replace(/\{\{\s*Organization\.Email\s*\}\}/g, org.Email || 'info@company.com');
        result = result.replace(/\{\{\s*Organization\.Address\s*\}\}/g, org.Address || '100 Enterprise Way, Suite 400');
        result = result.replace(/\{\{\s*Organization\.WorkingHour\s*\}\}/g, org.WorkingHour || 'Mon - Fri: 9:00 AM - 6:00 PM');

        return result;
    } catch (e) {
        console.warn('[SectionBuilder] Could not hydrate Mustache tokens:', e);
        return templateHtml;
    }
}

/**
 * Renders the standalone sandbox HTML into the iframe based on currentSandboxScope.
 */
function renderSandboxDoc() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    var renderedHtml = '';
    var combinedCss = '';
    var combinedJs = '';

    // Collect extra discovered Font and Icon CDN injection tags from server response
    var extraHeadTags = '';
    if (rawExtractionData.codeInjections && Array.isArray(rawExtractionData.codeInjections)) {
        rawExtractionData.codeInjections.forEach(function (tag) {
            if (tag.zone === 'head' && tag.content) {
                extraHeadTags += tag.content + '\n    ';
            }
        });
    }

    if (currentSandboxScope === 'single') {
        var rawHtml = sec.htmlTemplate || sec.html_template || '';
        var sampleJson = sec.sampleContentJson || sec.sample_content_json || '{}';
        var containerClass = 'sec-variant-' + (sec.variantCode || sec.variant_code || 'section').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        var hydHtml = hydrateMustacheTokens(rawHtml, sampleJson);
        if (!hydHtml.includes(containerClass)) {
            renderedHtml = '<div class="' + containerClass + '">\n' + hydHtml + '\n</div>';
        } else {
            renderedHtml = hydHtml;
        }
        combinedCss = sec.scopedCss || sec.scoped_css || '';
        combinedJs = sec.jsScript || sec.js_script || '';
    } else if (currentSandboxScope === 'page') {
        // Collect all sections belonging to this page
        var pageSlug = (sec.parentPageSlugs && sec.parentPageSlugs[0]) || (sec.parent_page_slugs && sec.parent_page_slugs[0]) || 'home';
        var pageSections = rawExtractionData.sections.filter(function (s) {
            var pSlugs = s.parentPageSlugs || s.parent_page_slugs || [];
            return pSlugs.includes(pageSlug) || pageSlug === 'home';
        });

        if (pageSections.length === 0) pageSections = [sec];

        pageSections.forEach(function (s) {
            var rawH = s.htmlTemplate || s.html_template || '';
            var sampleJ = s.sampleContentJson || s.sample_content_json || '{}';
            var cCls = 'sec-variant-' + (s.variantCode || s.variant_code || 'section').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            var hydH = hydrateMustacheTokens(rawH, sampleJ);
            if (!hydH.includes(cCls)) {
                renderedHtml += '<div class="' + cCls + '">\n' + hydH + '\n</div>\n';
            } else {
                renderedHtml += hydH + '\n';
            }
            combinedCss += (s.scopedCss || s.scoped_css || '') + '\n';
            if (s.jsScript || s.js_script) combinedJs += (s.jsScript || s.js_script) + '\n';
        });
    } else {
        // Full Suite Sandbox
        rawExtractionData.sections.forEach(function (s) {
            var rawH = s.htmlTemplate || s.html_template || '';
            var sampleJ = s.sampleContentJson || s.sample_content_json || '{}';
            var cCls = 'sec-variant-' + (s.variantCode || s.variant_code || 'section').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            var hydH = hydrateMustacheTokens(rawH, sampleJ);
            if (!hydH.includes(cCls)) {
                renderedHtml += '<div class="' + cCls + '">\n' + hydH + '\n</div>\n';
            } else {
                renderedHtml += hydH + '\n';
            }
            combinedCss += (s.scopedCss || s.scoped_css || '') + '\n';
            if (s.jsScript || s.js_script) combinedJs += (s.jsScript || s.js_script) + '\n';
        });
    }

    var docHtml = '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        '    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n' +
        '    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />\n' +
        '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />\n' +
        '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />\n' +
        '    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />\n' +
        '    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" />\n' +
        '    <link rel="stylesheet" href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" />\n' +
        '    ' + extraHeadTags +
        '    <style>\n' +
        '        *, *::before, *::after { box-sizing: border-box; }\n' +
        '        body { margin: 0; padding: 0; font-family: "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; }\n' +
        '        img, svg { max-width: 100%; height: auto; }\n' +
        '        a { color: inherit; text-decoration: none; }\n' +
        combinedCss + '\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body>\n' +
        renderedHtml + '\n' +
        (combinedJs ? '<script>' + combinedJs + '<\/script>\n' : '') +
        '</body>\n' +
        '</html>';

    var iframe = document.getElementById('sectionPreviewIframe');
    if (iframe) {
        iframe.srcdoc = docHtml;
    }
}

function setSandboxScope(scope) {
    currentSandboxScope = scope;
    document.querySelectorAll('.preview-scope-pill').forEach(function (b) { b.classList.remove('active'); });
    var activeBtn = document.getElementById('scopeBtn_' + scope);
    if (activeBtn) activeBtn.classList.add('active');
    renderSandboxDoc();
}

/**
 * Sets quick prompt from chips into the AI textarea.
 */
function setAiQuickPrompt(promptText) {
    var textarea = document.getElementById('aiTweakUserPrompt');
    if (textarea) {
        textarea.value = promptText;
        textarea.focus();
    }
}

/**
 * Executes in-preview AI section tweak via AJAX endpoint.
 */
function executeSectionAiTweak() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    var promptEl = document.getElementById('aiTweakUserPrompt');
    var providerEl = document.getElementById('aiModelProviderSelect');
    var prompt = promptEl ? promptEl.value.trim() : '';
    var provider = providerEl ? providerEl.value : 'Gemini';

    if (!prompt) {
        alert('Please enter an instruction prompt for the AI Co-Pilot.');
        if (promptEl) promptEl.focus();
        return;
    }

    var btn = document.getElementById('btnExecuteAiTweak');
    var btnText = document.getElementById('aiTweakBtnText');
    var btnIcon = document.getElementById('aiTweakBtnIcon');

    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'AI Thinking & Generating...';
    if (btnIcon) {
        btnIcon.innerText = 'sync';
        btnIcon.style.animation = 'spin 1s linear infinite';
    }

    // Save backup before tweaking
    backupOriginalSectionCode = {
        htmlTemplate: sec.htmlTemplate || sec.html_template,
        scopedCss: sec.scopedCss || sec.scoped_css
    };

    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    var payload = {
        section_key: sec.id || ('sec_' + activePreviewIndex),
        category_key: sec.categoryKey || sec.category_key || 'body',
        title: sec.name || 'Section',
        html_template: sec.htmlTemplate || sec.html_template || '',
        scoped_css: sec.scopedCss || sec.scoped_css || '',
        user_prompt: prompt,
        provider: provider
    };

    fetch('/centralwks/templates/import?handler=TweakSectionWithAi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerText = 'Execute AI Tweak';
        if (btnIcon) {
            btnIcon.innerText = 'magic_button';
            btnIcon.style.animation = 'none';
        }

        if (data.success && data.html_template) {
            // Update active section
            sec.htmlTemplate = data.html_template;
            sec.html_template = data.html_template;
            sec.scopedCss = data.scoped_css;
            sec.scoped_css = data.scoped_css;

            updateModalCodeBlocks(sec);
            renderSandboxDoc();

            // Display explanation card
            var resultCard = document.getElementById('aiTweakResultCard');
            var explText = document.getElementById('aiTweakExplanationText');
            var placeholdersList = document.getElementById('aiTweakPlaceholdersList');

            if (explText) explText.innerText = data.explanation || 'Updated HTML structure, responsive scoped CSS, and standardized placeholders.';
            
            if (placeholdersList) {
                placeholdersList.innerHTML = '';
                var placeholders = data.placeholders || [];
                if (placeholders.length === 0) {
                    placeholders = ['Hero_Title', 'Company_Name', 'Button_Text'];
                }
                placeholders.forEach(function (ph) {
                    placeholdersList.innerHTML += '<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-family: monospace; font-size: 11px; padding: 2px 8px; border-radius: 6px;">{{' + escapeHtml(ph) + '}}</span>';
                });
            }

            if (resultCard) resultCard.style.display = 'block';
        } else {
            alert('AI Tweak failed: ' + (data.error_message || data.errorMessage || 'Unknown error.'));
        }
    })
    .catch(function (err) {
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerText = 'Execute AI Tweak';
        if (btnIcon) {
            btnIcon.innerText = 'magic_button';
            btnIcon.style.animation = 'none';
        }
        alert('Network error during AI Tweak: ' + err);
    });
}

function applyAiTweakAndShowSandbox() {
    switchPreviewTab('sandbox');
}

/**
 * Executes AI Precision Tree-Shaking and Filtering:
 * Analyzes the section's HTML markup against source stylesheets/scripts and strips all unrelated CSS/JS
 * without inventing or hallucinating new code.
 */
function triggerAiPrecisionFilter() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    var btnCss = document.getElementById('btnAiFilterCssAction');
    var btnJs = document.getElementById('btnAiFilterJsAction');
    var iconEl = document.getElementById('aiFilterCssIcon');
    var textEl = document.getElementById('aiFilterCssText');

    var origCssBtnText = textEl ? textEl.innerText : 'AI Precision Tree-Shake & Filter';

    if (btnCss) {
        btnCss.disabled = true;
        btnCss.style.opacity = '0.75';
    }
    if (btnJs) btnJs.disabled = true;
    if (textEl) textEl.innerText = 'AI Tree-Shaking (Zero Hallucination)...';
    if (iconEl) {
        iconEl.innerText = 'sync';
        iconEl.style.animation = 'spin 1s linear infinite';
    }

    // Save backup before filtering
    backupOriginalSectionCode = {
        htmlTemplate: sec.htmlTemplate || sec.html_template,
        scopedCss: sec.scopedCss || sec.scoped_css,
        jsScript: sec.jsScript || sec.js_script
    };

    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    // Collect all raw CSS (from current scoped CSS or full inspection stylesheets)
    var rawCss = sec.scopedCss || sec.scoped_css || '';
    if (rawInspectionData && rawInspectionData.stylesheets && rawInspectionData.stylesheets.length > 0) {
        var allStyles = rawInspectionData.stylesheets.map(function (s) { return s.content || ''; }).join('\n');
        if (allStyles.length > rawCss.length) {
            rawCss = allStyles;
        }
    }

    // Collect raw JS from inspection scripts
    var rawJs = sec.jsScript || sec.js_script || '';
    if (rawInspectionData && rawInspectionData.scripts && rawInspectionData.scripts.length > 0) {
        var allScripts = rawInspectionData.scripts.map(function (sc) { return sc.content || ''; }).join('\n');
        if (allScripts.length > rawJs.length) {
            rawJs = allScripts;
        }
    }

    var providerEl = document.getElementById('aiModelProviderSelect');
    var provider = providerEl ? providerEl.value : 'Gemini';

    var containerClass = 'sec-variant-' + (sec.variantCode || sec.variant_code || 'section').toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    var payload = {
        section_key: sec.id || ('sec_' + activePreviewIndex),
        category_key: sec.categoryKey || sec.category_key || 'body',
        title: sec.name || 'Section',
        html_template: sec.htmlTemplate || sec.html_template || '',
        raw_css: rawCss,
        raw_js: rawJs,
        container_class: containerClass,
        provider: provider
    };

    fetch('/centralwks/templates/import?handler=AiPrecisionFilter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (btnCss) {
            btnCss.disabled = false;
            btnCss.style.opacity = '1';
        }
        if (btnJs) btnJs.disabled = false;
        if (textEl) textEl.innerText = origCssBtnText;
        if (iconEl) {
            iconEl.innerText = 'filter_alt';
            iconEl.style.animation = 'none';
        }

        if (data.success && data.scoped_css) {
            // Update active section's CSS and JS with the precision-filtered result
            sec.scopedCss = data.scoped_css;
            sec.scoped_css = data.scoped_css;
            if (data.js_script !== undefined && data.js_script !== null) {
                sec.jsScript = data.js_script;
                sec.js_script = data.js_script;
            }

            updateModalCodeBlocks(sec);
            renderSandboxDoc();

            // Display explanation card in AI tab
            var resultCard = document.getElementById('aiTweakResultCard');
            var explText = document.getElementById('aiTweakExplanationText');
            if (explText) {
                explText.innerHTML = '<strong>Tree-Shake Complete:</strong> ' + escapeHtml(data.explanation || 'Filtered unused rules and isolated exact component styles.') +
                    '<br/><span style="color: #38bdf8; font-weight: 700; margin-top: 6px; display: inline-block;">Reduced from ' + data.original_lines_css + ' lines &rarr; ' + data.filtered_lines_css + ' lines (' + (data.reduction_percentage || '0%') + ' reduction). Zero synthetic code invented.</span>';
            }
            if (resultCard) resultCard.style.display = 'block';

            // Show feedback notification
            alert('🎯 AI Precision Filter Complete!\n\n' +
                  '• Original CSS: ' + data.original_lines_css + ' lines\n' +
                  '• Filtered Scoped CSS: ' + data.filtered_lines_css + ' lines (' + data.reduction_percentage + ' reduction)\n' +
                  '• Filtered JS: ' + (data.js_script ? 'Extracted exact component event handlers' : 'Pure CSS layout (no JS needed)') + '\n\n' +
                  'All unrelated rules discarded with zero invented code.');
        } else {
            alert('AI Precision Filter failed: ' + (data.error_message || data.errorMessage || 'Unknown error.'));
        }
    })
    .catch(function (err) {
        if (btnCss) {
            btnCss.disabled = false;
            btnCss.style.opacity = '1';
        }
        if (btnJs) btnJs.disabled = false;
        if (textEl) textEl.innerText = origCssBtnText;
        if (iconEl) {
            iconEl.innerText = 'filter_alt';
            iconEl.style.animation = 'none';
        }
        alert('Network error during AI Precision Filter: ' + err);
    });
}

/**
 * Executes full 4-pillar AI cleanup on the currently active section in the studio:
 * 1. Standardizes HTML with {{Mustache}} tokens.
 * 2. Precision tree-shakes & scopes CSS (zero invented code).
 * 3. Extracts real component interactive JavaScript.
 * 4. Synthesizes realistic demo Mock Data JSON.
 */
function cleanActiveSectionWithAi() {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    var btn = document.getElementById('btnModalCleanSectionWithAi');
    var iconEl = document.getElementById('modalAiCleanIcon');
    var textEl = document.getElementById('modalAiCleanText');

    if (btn) btn.disabled = true;
    if (textEl) textEl.innerText = 'AI Cleaning & Tree-Shaking...';
    if (iconEl) {
        iconEl.innerText = 'sync';
        iconEl.style.animation = 'spin 1s linear infinite';
    }

    // Save backup before cleaning
    backupOriginalSectionCode = {
        htmlTemplate: sec.htmlTemplate || sec.html_template,
        scopedCss: sec.scopedCss || sec.scoped_css,
        jsScript: sec.jsScript || sec.js_script,
        sampleContentJson: sec.sampleContentJson || sec.sample_content_json
    };

    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    var rawCss = sec.scopedCss || sec.scoped_css || '';
    if (rawInspectionData && rawInspectionData.stylesheets && rawInspectionData.stylesheets.length > 0) {
        var allStyles = rawInspectionData.stylesheets.map(function (s) { return s.content || ''; }).join('\n');
        if (allStyles.length > rawCss.length) rawCss = allStyles;
    }

    var rawJs = sec.jsScript || sec.js_script || '';
    if (rawInspectionData && rawInspectionData.scripts && rawInspectionData.scripts.length > 0) {
        var allScripts = rawInspectionData.scripts.map(function (sc) { return sc.content || ''; }).join('\n');
        if (allScripts.length > rawJs.length) rawJs = allScripts;
    }

    var providerEl = document.getElementById('aiModelProviderSelect');
    var provider = providerEl ? providerEl.value : 'Gemini';
    var containerClass = 'sec-variant-' + (sec.variantCode || sec.variant_code || 'section').toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    var payload = {
        section_key: sec.id || ('sec_' + activePreviewIndex),
        category_key: sec.categoryKey || sec.category_key || 'body',
        title: sec.name || 'Section',
        html_template: sec.htmlTemplate || sec.html_template || '',
        raw_css: rawCss,
        raw_js: rawJs,
        container_class: containerClass,
        provider: provider
    };

    fetch('/centralwks/templates/import?handler=AiCleanSection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (btn) btn.disabled = false;
        if (textEl) textEl.innerText = 'Clean Section with AI';
        if (iconEl) {
            iconEl.innerText = 'auto_fix_high';
            iconEl.style.animation = 'none';
        }

        if (data.success) {
            sec.htmlTemplate = data.html_template || sec.htmlTemplate;
            sec.html_template = data.html_template || sec.html_template;
            sec.scopedCss = data.scoped_css || sec.scopedCss;
            sec.scoped_css = data.scoped_css || sec.scoped_css;
            sec.jsScript = data.js_script !== undefined ? data.js_script : sec.jsScript;
            sec.js_script = data.js_script !== undefined ? data.js_script : sec.js_script;
            sec.sampleContentJson = data.sample_content_json || sec.sampleContentJson;
            sec.sample_content_json = data.sample_content_json || sec.sample_content_json;

            updateModalCodeBlocks(sec);
            renderSandboxDoc();
            updateCardBadge(activePreviewIndex, sec.scopedCss);

            alert('✨ AI Section Cleanup Complete!\n\n' +
                  '• HTML: Parameterized with standard {{Mustache}} tokens\n' +
                  '• Scoped CSS: ' + data.original_lines_css + ' lines \u2192 ' + data.filtered_lines_css + ' lines (' + (data.reduction_percentage || '0%') + ' reduction)\n' +
                  '• Script JS: ' + (data.js_script ? 'Extracted component interactive logic' : 'Pure CSS layout (no JS needed)') + '\n' +
                  '• Mock JSON: Synthesized realistic demo dataset matching all tokens.');
        } else {
            alert('AI Cleanup error: ' + (data.error_message || data.errorMessage || 'Unknown error.'));
        }
    })
    .catch(function (err) {
        if (btn) btn.disabled = false;
        if (textEl) textEl.innerText = 'Clean Section with AI';
        if (iconEl) {
            iconEl.innerText = 'auto_fix_high';
            iconEl.style.animation = 'none';
        }
        alert('Network error during AI cleanup: ' + err);
    });
}

/**
 * Batch-cleans all sliced sections in the suite sequentially using AI.
 */
async function batchCleanAllSectionsWithAi() {
    if (!rawExtractionData || !rawExtractionData.sections || rawExtractionData.sections.length === 0) {
        alert('No sliced sections available to clean.');
        return;
    }

    var total = rawExtractionData.sections.length;
    if (!confirm('Run complete AI Tree-Shaking & Cleanup across all ' + total + ' modular sections? This will clean HTML, filter CSS, extract JS, and synthesize mock JSON for each section.')) {
        return;
    }

    var btn = document.getElementById('btnBatchAiClean');
    var textEl = document.getElementById('batchAiCleanText');
    var iconEl = document.getElementById('batchAiCleanIcon');

    if (btn) btn.disabled = true;
    if (iconEl) {
        iconEl.innerText = 'sync';
        iconEl.style.animation = 'spin 1s linear infinite';
    }

    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    var allStyles = (rawInspectionData && rawInspectionData.stylesheets) 
        ? rawInspectionData.stylesheets.map(function (s) { return s.content || ''; }).join('\n') 
        : '';
    var allScripts = (rawInspectionData && rawInspectionData.scripts) 
        ? rawInspectionData.scripts.map(function (sc) { return sc.content || ''; }).join('\n') 
        : '';

    var cleanedCount = 0;
    for (var i = 0; i < total; i++) {
        var sec = rawExtractionData.sections[i];
        if (textEl) textEl.innerText = 'Cleaning ' + (i + 1) + ' of ' + total + ' (' + sec.name + ')...';

        var containerClass = 'sec-variant-' + (sec.variantCode || sec.variant_code || ('sec_' + i)).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        var payload = {
            section_key: sec.id || ('sec_' + i),
            category_key: sec.categoryKey || sec.category_key || 'body',
            title: sec.name || 'Section',
            html_template: sec.htmlTemplate || sec.html_template || '',
            raw_css: allStyles || sec.scopedCss || sec.scoped_css || '',
            raw_js: allScripts || sec.jsScript || sec.js_script || '',
            container_class: containerClass,
            provider: 'Gemini'
        };

        try {
            var response = await fetch('/centralwks/templates/import?handler=AiCleanSection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(payload)
            });
            var data = await response.json();
            if (data.success) {
                sec.htmlTemplate = data.html_template || sec.htmlTemplate;
                sec.html_template = data.html_template || sec.html_template;
                sec.scopedCss = data.scoped_css || sec.scopedCss;
                sec.scoped_css = data.scoped_css || sec.scoped_css;
                sec.jsScript = data.js_script !== undefined ? data.js_script : sec.jsScript;
                sec.js_script = data.js_script !== undefined ? data.js_script : sec.js_script;
                sec.sampleContentJson = data.sample_content_json || sec.sampleContentJson;
                sec.sample_content_json = data.sample_content_json || sec.sample_content_json;
                updateCardBadge(i, sec.scopedCss);
                cleanedCount++;
            }
        } catch (e) {
            console.warn('Batch clean error on section ' + i, e);
        }
    }

    if (btn) btn.disabled = false;
    if (textEl) textEl.innerText = 'AI Clean & Tree-Shake All';
    if (iconEl) {
        iconEl.innerText = 'auto_fix_high';
        iconEl.style.animation = 'none';
    }

    alert('🎉 Batch AI Cleanup Complete!\nSuccessfully cleaned, tree-shook, and synthesized mock JSON for ' + cleanedCount + ' of ' + total + ' sections.');
}

function updateCardBadge(index, scopedCss) {
    var badge = document.getElementById('cardCssBadge_' + index);
    if (badge && scopedCss) {
        var bytes = new Blob([scopedCss]).size;
        var kb = (bytes / 1024).toFixed(1);
        badge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 13px; vertical-align: middle;">auto_fix_high</span> AI Cleaned: ' + kb + ' KB';
        badge.style.background = 'rgba(99, 102, 241, 0.15)';
        badge.style.borderColor = '#6366f1';
        badge.style.color = '#818cf8';
    }
}

function revertAiTweak() {
    if (!backupOriginalSectionCode || !rawExtractionData || !rawExtractionData.sections[activePreviewIndex]) return;

    var sec = rawExtractionData.sections[activePreviewIndex];
    sec.htmlTemplate = backupOriginalSectionCode.htmlTemplate;
    sec.html_template = backupOriginalSectionCode.htmlTemplate;
    sec.scopedCss = backupOriginalSectionCode.scopedCss;
    sec.scoped_css = backupOriginalSectionCode.scopedCss;

    updateModalCodeBlocks(sec);
    renderSandboxDoc();

    var resultCard = document.getElementById('aiTweakResultCard');
    if (resultCard) resultCard.style.display = 'none';
    alert('Reverted to original section markup.');
}

function closeSectionPreviewModal() {
    var modalOverlay = document.getElementById('sectionPreviewModalOverlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
    var iframe = document.getElementById('sectionPreviewIframe');
    if (iframe) iframe.srcdoc = 'about:blank';
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSectionPreviewModal();
});

function switchPreviewTab(tabKey) {
    document.querySelectorAll('.modal-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.modal-tab-pane').forEach(function (p) { p.style.display = 'none'; });

    var targetBtn = document.getElementById('tabBtn_' + tabKey);
    var targetPane = document.getElementById('pane_' + tabKey);

    if (targetBtn) targetBtn.classList.add('active');
    if (targetPane) targetPane.style.display = (tabKey === 'sandbox') ? 'flex' : 'block';
}

function setPreviewViewport(mode) {
    var wrapper = document.getElementById('iframeWrapper');
    if (!wrapper) return;

    wrapper.classList.remove('vp-tablet', 'vp-mobile');
    document.querySelectorAll('#btnVpDesktop, #btnVpTablet, #btnVpMobile').forEach(function (b) { b.classList.remove('active'); });

    if (mode === 'tablet') {
        wrapper.classList.add('vp-tablet');
        var btnTab = document.getElementById('btnVpTablet');
        if (btnTab) btnTab.classList.add('active');
    } else if (mode === 'mobile') {
        wrapper.classList.add('vp-mobile');
        var btnMob = document.getElementById('btnVpMobile');
        if (btnMob) btnMob.classList.add('active');
    } else {
        var btnDesk = document.getElementById('btnVpDesktop');
        if (btnDesk) btnDesk.classList.add('active');
    }
}

/**
 * Step 5: Publish a single section to the Master Catalog Marketplace.
 */
function publishSingleSection(index, btnEl) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[index]) return;

    var sec = rawExtractionData.sections[index];
    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    var origText = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; animation: spin 1s linear infinite;">sync</span> Publishing...';
    }

    var payload = {
        name: sec.name,
        variantCode: sec.variantCode || sec.variant_code,
        categoryKey: sec.categoryKey || sec.category_key,
        suiteCode: rawExtractionData.groupCode || rawExtractionData.group_code || 'modern',
        badge: 'New',
        description: sec.description,
        htmlTemplate: sec.htmlTemplate || sec.html_template,
        scopedCss: sec.scopedCss || sec.scoped_css,
        jsScript: sec.jsScript || sec.js_script,
        sampleContentJson: sec.sampleContentJson || sec.sample_content_json,
        previewIcon: sec.previewIcon || sec.preview_icon || 'widgets',
        thumbnailGradient: sec.thumbnailGradient || sec.thumbnail_gradient,
        sortOrder: sec.sortOrder || sec.sort_order || 10
    };

    fetch('/centralwks/templates/import?handler=PublishSection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (btnEl) {
            btnEl.disabled = false;
            if (data.success) {
                btnEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; color: #10b981;">check_circle</span> Published';
                btnEl.style.background = '#10b981';
                btnEl.style.borderColor = '#10b981';
                btnEl.style.color = '#ffffff';
            } else {
                btnEl.innerHTML = origText;
                alert('Publish error: ' + data.message);
            }
        }
    })
    .catch(function (err) {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = origText;
        }
        alert('Publish request error: ' + err);
    });
}

/**
 * Step 5: Publish all selected sections in a single batch suite.
 */
function publishSelectedBatch() {
    if (!rawExtractionData || !rawExtractionData.sections) return;

    var selectedIndices = [];
    document.querySelectorAll('.section-select-check:checked').forEach(function (chk) {
        selectedIndices.push(parseInt(chk.getAttribute('data-index')));
    });

    if (selectedIndices.length === 0) {
        alert('Please select at least one section to publish.');
        return;
    }

    if (!confirm('Publish ' + selectedIndices.length + ' sections as suite \'' + (rawExtractionData.suiteName || rawExtractionData.suite_name) + '\' to Marketplace?')) {
        return;
    }

    var selectedSections = selectedIndices.map(function (idx) {
        var sec = rawExtractionData.sections[idx];
        return {
            name: sec.name,
            variantCode: sec.variantCode || sec.variant_code,
            categoryKey: sec.categoryKey || sec.category_key,
            suiteCode: rawExtractionData.groupCode || rawExtractionData.group_code || 'modern',
            badge: 'New',
            description: sec.description,
            htmlTemplate: sec.htmlTemplate || sec.html_template,
            scopedCss: sec.scopedCss || sec.scoped_css,
            jsScript: sec.jsScript || sec.js_script,
            sampleContentJson: sec.sampleContentJson || sec.sample_content_json,
            previewIcon: sec.previewIcon || sec.preview_icon || 'widgets',
            thumbnailGradient: sec.thumbnailGradient || sec.thumbnail_gradient,
            sortOrder: sec.sortOrder || sec.sort_order || 10
        };
    });

    var tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    var token = tokenEl ? tokenEl.value : '';

    var payload = {
        suiteCode: rawExtractionData.groupCode || rawExtractionData.group_code || 'modern',
        sections: selectedSections
    };

    fetch('/centralwks/templates/import?handler=PublishBatch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify(payload)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (data.success) {
            alert('Success! ' + data.message);
            window.location.href = '/centralwks/templates';
        } else {
            alert('Batch publish error: ' + data.message);
        }
    })
    .catch(function (err) {
        alert('Batch publish network error: ' + err);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeHtmlAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Launches the full multi-section website demo sandbox in a popout window.
 */
function openFullSuiteDemoFromImport() {
    var suiteInput = document.getElementById('inputSuiteCode') || document.getElementById('imageSuiteName');
    var suiteCode = (suiteInput && suiteInput.value.trim()) ? suiteInput.value.trim() : (rawExtractionData && (rawExtractionData.groupCode || rawExtractionData.group_code)) || 'modern';
    var focusKey = '';
    if (rawExtractionData && rawExtractionData.sections && rawExtractionData.sections[activePreviewIndex]) {
        var sec = rawExtractionData.sections[activePreviewIndex];
        focusKey = sec.variantCode || sec.variant_code || sec.categoryKey || '';
    }
    window.open('/templates/preview-suite/' + encodeURIComponent(suiteCode) + '?focus=' + encodeURIComponent(focusKey), '_blank');
}

