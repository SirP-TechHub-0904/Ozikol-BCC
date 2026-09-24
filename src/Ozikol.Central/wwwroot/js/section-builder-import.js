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
            } catch (e) {
                console.error('[SectionBuilder] Failed to parse extraction result JSON:', e);
            }
        }
    }

    updateHtmlCharCount();
});

/**
 * Jump to specific studio step (1 to 5).
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
        if (!rawInspectionData) {
            // If user hasn't fetched inspection yet, prompt
            var html = document.getElementById('inputHtmlSource');
            if (!html || !html.value.trim()) {
                alert('Please provide HTML page source in Step 1 first.');
                jumpToStep(1);
                return;
            }
        }
        if (p1) p1.style.display = 'none';
        if (p2) p2.style.display = 'block';
        if (p3) p3.style.display = 'none';
    } else if (step >= 3) {
        if (!rawExtractionData || !rawExtractionData.sections || rawExtractionData.sections.length === 0) {
            alert('Please slice modular sections in Step 2 first.');
            jumpToStep(2);
            return;
        }
        if (p1) p1.style.display = 'none';
        if (p2) p2.style.display = 'none';
        if (p3) p3.style.display = 'block';
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
 * Switches between "Paste Page Source / HTML" and "Live Website URL" tabs in Step 1.
 */
function switchImportTab(tabName) {
    var panelUrl = document.getElementById('panelUrlExtractor');
    var panelSource = document.getElementById('panelSourceExtractor');
    var btnUrl = document.getElementById('tabBtnUrl');
    var btnSource = document.getElementById('tabBtnSource');

    if (tabName === 'source') {
        if (panelUrl) panelUrl.style.display = 'none';
        if (panelSource) panelSource.style.display = 'block';
        if (btnUrl) btnUrl.classList.remove('active');
        if (btnSource) btnSource.classList.add('active');
    } else {
        if (panelUrl) panelUrl.style.display = 'block';
        if (panelSource) panelSource.style.display = 'none';
        if (btnUrl) btnUrl.classList.add('active');
        if (btnSource) btnSource.classList.remove('active');
    }
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
            var activeClass = (idx === 0) ? 'active' : '';

            var itemHtml = '<div class="css-file-pill ' + activeClass + '" id="cssPill_' + idx + '" onclick="selectCssFile(' + idx + ')">' +
                '<span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">' + escapeHtml(name) + '</span>' +
                '<span style="background: rgba(255,255,255,0.15); font-size: 10px; padding: 2px 6px; border-radius: 4px;">' + sizeKb + ' KB</span>' +
            '</div>';
            cssFilesContainer.innerHTML += itemHtml;
        });
    }

    // Select first CSS file by default
    if (stylesheets.length > 0) {
        selectCssFile(0);
    }

    // 3. Populate JS Scripts Tab
    var scripts = data.scripts || [];
    var jsTabTitle = document.getElementById('wbJsTabTitle');
    if (jsTabTitle) {
        jsTabTitle.innerText = 'JS Scripts (' + scripts.length + ')';
    }
    var jsContainer = document.getElementById('wbJsScriptsContainer');
    if (jsContainer) {
        jsContainer.innerHTML = '';
        if (scripts.length === 0) {
            jsContainer.innerHTML = '<div style="color: #94a3b8; font-size: 13px;">No external or inline scripts detected.</div>';
        } else {
            scripts.forEach(function (sc, idx) {
                var scName = sc.name || ('script_' + (idx + 1) + '.js');
                var scUrl = sc.url || 'Inline Script';
                jsContainer.innerHTML += '<div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; margin-bottom: 10px;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">' +
                        '<span style="font-size: 13px; font-weight: 700; color: #fde047;">' + escapeHtml(scName) + '</span>' +
                        '<span style="font-size: 11px; color: #94a3b8; font-family: monospace;">' + escapeHtml(scUrl) + '</span>' +
                    '</div>' +
                '</div>';
            });
        }
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

    if (nameEl) nameEl.innerText = item.name || 'stylesheet.css';
    if (sizeEl) sizeEl.innerText = (item.sizeKb || item.size_kb || 0) + ' KB';
    if (editor) editor.value = item.content || '';
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
        rawInspectionData.stylesheets[currentWbCssIndex].content = editor.value;
        var hiddenStylesheets = document.getElementById('wbFormEditedStylesheetsJson');
        if (hiddenStylesheets) {
            hiddenStylesheets.value = JSON.stringify(rawInspectionData.stylesheets);
        }
    }
}

function updateHtmlCharCount() {
    var editor = document.getElementById('wbHtmlEditor');
    var countEl = document.getElementById('wbHtmlCharCount');
    if (editor && countEl) {
        var count = editor.value.length;
        countEl.innerText = count.toLocaleString() + ' characters';
    }
}

function showInspectionLoading() {
    var btn = document.getElementById('btnFetchInspectAssets');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span> <span>Fetching Code & Assets...</span>';
    }
}

function showSlicingLoading() {
    var loader = document.getElementById('slicingLoadingState');
    if (loader) loader.style.display = 'block';

    var btn = document.getElementById('btnSliceSectionsAction');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px; animation: spin 1s linear infinite;">sync</span> <span>Slicing Sections...</span>';
    }
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

/**
 * Step 4: Opens the Live Preview Sandbox Modal with scoped CSS, JS, and Viewports.
 */
function openSectionPreviewModal(index) {
    if (!rawExtractionData || !rawExtractionData.sections || !rawExtractionData.sections[index]) {
        console.warn('[SectionBuilder] Section index not found:', index);
        return;
    }

    activePreviewIndex = index;
    var sec = rawExtractionData.sections[index];

    var name = sec.name || 'Section Preview';
    var categoryKey = sec.categoryKey || sec.category_key || 'body';
    var variantCode = sec.variantCode || sec.variant_code || '';
    var previewIcon = sec.previewIcon || sec.preview_icon || 'view_in_ar';
    var htmlTemplate = sec.htmlTemplate || sec.html_template || '';
    var scopedCss = sec.scopedCss || sec.scoped_css || '';
    var jsScript = sec.jsScript || sec.js_script || '';
    var sampleContentJson = sec.sampleContentJson || sec.sample_content_json || '{}';
    var secId = sec.id || ('sec_' + index);

    var titleEl = document.getElementById('modalPreviewTitle');
    var subtitleEl = document.getElementById('modalPreviewSubtitle');
    var iconEl = document.getElementById('modalPreviewIcon');

    if (titleEl) titleEl.innerText = name;
    if (subtitleEl) {
        var sizeKb = Math.round(scopedCss.length / 1024);
        subtitleEl.innerText = categoryKey.toUpperCase() + ' • ' + variantCode + ' • Scoped CSS (' + sizeKb + ' KB)';
    }
    if (iconEl) iconEl.innerText = previewIcon;

    var blockHtml = document.getElementById('codeBlockHtml');
    var blockCss = document.getElementById('codeBlockCss');
    var blockJs = document.getElementById('codeBlockJs');
    var blockJson = document.getElementById('codeBlockJson');

    if (blockHtml) blockHtml.innerText = htmlTemplate;
    if (blockCss) blockCss.innerText = scopedCss || '/* Zero extra CSS rules required */';
    if (blockJs) blockJs.innerText = jsScript || '// No interactive script required';
    if (blockJson) blockJson.innerText = sampleContentJson;

    // Build standalone HTML document for iframe sandbox
    var docHtml = '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        '    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n' +
        '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />\n' +
        '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />\n' +
        '    <style>\n' +
        '        *, *::before, *::after { box-sizing: border-box; }\n' +
        '        body { margin: 0; padding: 0; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; }\n' +
        '        img, svg { max-width: 100%; height: auto; }\n' +
        '        a { color: inherit; text-decoration: none; }\n' +
        scopedCss + '\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body>\n' +
        htmlTemplate + '\n' +
        (jsScript ? '<script>' + jsScript + '<\/script>\n' : '') +
        '</body>\n' +
        '</html>';

    var iframe = document.getElementById('sectionPreviewIframe');
    if (iframe) {
        iframe.srcdoc = docHtml;
    }

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
