/**
 * Ozikol Section & Page Compiler Renderer
 * High-performance compilation and hydration engine for modular website sections and pages.
 * Supports multi-level hierarchical menus, dynamic list loops, brand tokens, scoped CSS, and dependency resolution.
 */
var SectionCompilerRenderer = (function () {
    'use strict';

    /**
     * Default brand and site identity fallback tokens.
     */
    var DEFAULT_BRAND = {
        LogoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300',
        WhiteLogoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300',
        FaviconUrl: '/favicon.ico',
        WebsiteUrl: '#',
        Name: 'Ozikol Workspace',
        LoginButtonText: 'Sign In',
        RegisterButtonText: 'Get Started',
        PhoneNumber: '+1 (800) 555-0199',
        EmailAddress: 'contact@ozikol.com',
        Address: '100 Innovation Parkway, Suite 500, San Francisco, CA'
    };

    /**
     * Default list items for fallback rendering if mock JSON is empty.
     */
    var DEFAULT_SECTION_LISTS = [
        {
            Title: 'Cloud Architecture & Strategy',
            MiniTitle: '01',
            Description: 'End-to-end resilient infrastructure designed for global scale and high availability.',
            MoreDescription: 'Engineered with cutting-edge microservices and multi-tenant isolation.',
            ButtonText: 'Explore Platform',
            ButtonLink: '#',
            IconText: 'fa-solid fa-cloud',
            ImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
            CustomClass: 'active-feature'
        },
        {
            Title: 'Autonomous Intelligence Engine',
            MiniTitle: '02',
            Description: 'Intelligent workflow automation and real-time operational analytics.',
            MoreDescription: 'Harness predictive data models to accelerate enterprise productivity.',
            ButtonText: 'View Capabilities',
            ButtonLink: '#',
            IconText: 'fa-solid fa-brain',
            ImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
            CustomClass: ''
        },
        {
            Title: 'Zero-Trust Enterprise Security',
            MiniTitle: '03',
            Description: 'Continuous encryption, identity verification, and granular compliance safeguards.',
            MoreDescription: 'Built to exceed global privacy, SOC2, and data protection standards.',
            ButtonText: 'Learn More',
            ButtonLink: '#',
            IconText: 'fa-solid fa-shield-halved',
            ImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
            CustomClass: ''
        }
    ];

    /**
     * Default navigation menu fallback for header and navigation components.
     */
    var DEFAULT_MENU_ITEMS = [
        { Title: 'Home', Url: '/', IsActive: true, HasChildren: false, SubItems: [] },
        {
            Title: 'Features',
            Url: '#features',
            IsActive: false,
            HasChildren: true,
            SubItems: [
                { Title: 'Modular Builder', Url: '#builder', Description: 'Build custom digital experiences.' },
                { Title: 'AI Assistant', Url: '#ai-tools', Description: 'Automated synthesis & code refinement.' },
                { Title: 'Design System', Url: '#design-tokens', Description: 'Scoped CSS variables and tokens.' }
            ]
        },
        { Title: 'Solutions', Url: '#solutions', IsActive: false, HasChildren: false, SubItems: [] },
        { Title: 'Pricing', Url: '#pricing', IsActive: false, HasChildren: false, SubItems: [] },
        { Title: 'Contact', Url: '#contact', IsActive: false, HasChildren: false, SubItems: [] }
    ];

    /**
     * Parse sample content JSON safely.
     * @param {string|object} contentJson - Raw JSON string or existing object.
     * @returns {object} Parsed content dictionary.
     */
    function parseContentJson(contentJson) {
        if (!contentJson) return {};
        if (typeof contentJson === 'object') return contentJson;
        try {
            var trimmed = contentJson.trim();
            if (!trimmed) return {};
            return JSON.parse(trimmed);
        } catch (e) {
            console.warn('[SectionCompilerRenderer] Failed to parse sampleContentJson:', e);
            return {};
        }
    }

    /**
     * Multi-Tier Mustache Hydration Engine.
     * Compiles dynamic Mustache tokens, hierarchical menus, repeated lists, and brand tokens against mock data.
     * @param {string} html - Raw HTML template with Mustache placeholders.
     * @param {string|object} contentJson - Mock content JSON or dictionary.
     * @returns {string} Hydrated HTML markup.
     */
    function hydrateTemplate(html, contentJson) {
        if (!html) return '';

        var data = parseContentJson(contentJson);
        var result = html;

        // ---------------------------------------------------------------------
        // 1. TIER 1: HIERARCHICAL MENUS & NAVIGATION
        // ---------------------------------------------------------------------
        var menuRegex = /\{\{#(?:each\s+)?(?:menu_items|menu|navigation|nav_links|MenuItems|NavLinks)\}\}([\s\S]*?)\{\{\/(?:each\s+)?(?:menu_items|menu|navigation|nav_links|MenuItems|NavLinks)\}\}/gi;
        result = result.replace(menuRegex, function (_, itemTemplate) {
            var menuItems = data.menu_items || data.MenuItems || data.menu || data.navigation || data.nav_links || DEFAULT_MENU_ITEMS;
            if (!Array.isArray(menuItems) || menuItems.length === 0) {
                menuItems = DEFAULT_MENU_ITEMS;
            }

            return menuItems.map(function (item, idx) {
                var itemHtml = itemTemplate;
                var itemTitle = item.Title || item.title || item.label || item.name || ('Menu ' + (idx + 1));
                var itemUrl = item.Url || item.url || item.link || item.href || '#';
                var itemIcon = item.Icon || item.icon || '';
                var itemBadge = item.Badge || item.badge || '';
                var subItems = item.SubItems || item.sub_items || item.children || item.dropdown_items || item.sub_menu || [];
                var hasChildren = (Array.isArray(subItems) && subItems.length > 0) || item.HasChildren || item.has_children || false;

                // Handle SubItems / Children loop
                var subRegex = /\{\{#(?:each\s+)?(?:sub_items|children|dropdown_items|sub_menu|SubItems)\}\}([\s\S]*?)\{\{\/(?:each\s+)?(?:sub_items|children|dropdown_items|sub_menu|SubItems)\}\}/gi;
                itemHtml = itemHtml.replace(subRegex, function (_, subTemplate) {
                    if (!hasChildren || !Array.isArray(subItems) || subItems.length === 0) return '';
                    return subItems.map(function (sub) {
                        var subHtml = subTemplate;
                        var subTitle = sub.Title || sub.title || sub.label || sub.name || 'Sub Item';
                        var subUrl = sub.Url || sub.url || sub.link || sub.href || '#';
                        var subDesc = sub.Description || sub.description || '';
                        var subIcon = sub.Icon || sub.icon || '';

                        subHtml = subHtml.replace(/\{\{\s*(?:Title|title|label|name)\s*\}\}/gi, subTitle);
                        subHtml = subHtml.replace(/\{\{\s*(?:Url|url|link|href)\s*\}\}/gi, subUrl);
                        subHtml = subHtml.replace(/\{\{\s*(?:Description|description|desc)\s*\}\}/gi, subDesc);
                        subHtml = subHtml.replace(/\{\{\s*(?:Icon|icon|IconText)\s*\}\}/gi, subIcon);
                        return subHtml;
                    }).join('\n');
                });

                // Conditionals for menu items
                if (hasChildren) {
                    itemHtml = itemHtml.replace(/\{\{#(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}/gi, '$1');
                    itemHtml = itemHtml.replace(/\{\{\^(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}/gi, '');
                } else {
                    itemHtml = itemHtml.replace(/\{\{#(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}/gi, '');
                    itemHtml = itemHtml.replace(/\{\{\^(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}/gi, '$1');
                }

                if (item.IsActive || item.is_active) {
                    itemHtml = itemHtml.replace(/\{\{#(?:is_active|IsActive)\}\}([\s\S]*?)\{\{\/(?:is_active|IsActive)\}\}/gi, '$1');
                } else {
                    itemHtml = itemHtml.replace(/\{\{#(?:is_active|IsActive)\}\}([\s\S]*?)\{\{\/(?:is_active|IsActive)\}\}/gi, '');
                }

                itemHtml = itemHtml.replace(/\{\{\s*(?:Title|title|label|name)\s*\}\}/gi, itemTitle);
                itemHtml = itemHtml.replace(/\{\{\s*(?:Url|url|link|href)\s*\}\}/gi, itemUrl);
                itemHtml = itemHtml.replace(/\{\{\s*(?:Icon|icon|IconText)\s*\}\}/gi, itemIcon);
                itemHtml = itemHtml.replace(/\{\{\s*(?:Badge|badge)\s*\}\}/gi, itemBadge);
                return itemHtml;
            }).join('\n');
        });

        // ---------------------------------------------------------------------
        // 2. TIER 2: REPEATED LISTS & COMPONENT GRIDS
        // ---------------------------------------------------------------------
        var listBlockRegex = /\{\{#(?:each\s+)?([a-zA-Z0-9_\-]+)\}\}([\s\S]*?)\{\{\/(?:each\s+)?\1\}\}/g;
        result = result.replace(listBlockRegex, function (fullMatch, blockName, itemTemplate) {
            // Skip non-list tags like if/unless
            if (/^(?:if|unless|with)$/i.test(blockName)) return fullMatch;

            var items = data[blockName];
            if (!Array.isArray(items)) {
                // If it's SectionLists or PageSectionLists fallback
                if (/^(?:SectionLists|PageSectionLists|items|features|cards|services|testimonials|pricing_plans|faq)$/i.test(blockName)) {
                    items = DEFAULT_SECTION_LISTS;
                } else {
                    return '';
                }
            }

            if (items.length === 0) return '';

            return items.map(function (it, idx) {
                var rendered = itemTemplate;
                // If it is primitive string
                if (typeof it === 'string' || typeof it === 'number') {
                    rendered = rendered.replace(/\{\{\s*\.\s*\}\}/g, it);
                    rendered = rendered.replace(/\{\{\s*this\s*\}\}/g, it);
                    return rendered;
                }

                // Render all object keys dynamically
                Object.keys(it).forEach(function (key) {
                    var val = it[key];
                    if (typeof val === 'string' || typeof val === 'number') {
                        var valReg = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
                        rendered = rendered.replace(valReg, val);
                    }
                });

                // Standard aliases
                rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, it.Title || it.title || `Item ${idx + 1}`);
                rendered = rendered.replace(/\{\{\s*MiniTitle\s*\}\}/gi, it.MiniTitle || it.mini_title || `0${idx + 1}`);
                rendered = rendered.replace(/\{\{\s*Description\s*\}\}/gi, it.Description || it.description || '');
                rendered = rendered.replace(/\{\{\s*MoreDescription\s*\}\}/gi, it.MoreDescription || it.more_description || '');
                rendered = rendered.replace(/\{\{\s*ButtonText\s*\}\}/gi, it.ButtonText || it.button_text || 'Learn More');
                rendered = rendered.replace(/\{\{\s*ButtonLink\s*\}\}/gi, it.ButtonLink || it.button_link || '#');
                rendered = rendered.replace(/\{\{\s*IconText\s*\}\}/gi, it.IconText || it.icon || 'fa-solid fa-check');
                rendered = rendered.replace(/\{\{\s*ImageUrl\s*\}\}/gi, it.ImageUrl || it.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600');
                rendered = rendered.replace(/\{\{\s*Price\s*\}\}/gi, it.Price || it.price || '$49');
                rendered = rendered.replace(/\{\{\s*Period\s*\}\}/gi, it.Period || it.period || '/mo');
                rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, it.CustomClass || it.custom_class || '');
                return rendered;
            }).join('\n');
        });

        // ---------------------------------------------------------------------
        // 3. TIER 3: BRAND & IDENTITY TOKENS
        // ---------------------------------------------------------------------
        var brand = Object.assign({}, DEFAULT_BRAND, data.Brand || {});
        result = result.replace(/\{\{\s*Brand\.LogoUrl\s*\}\}/gi, brand.LogoUrl || data.LogoUrl || DEFAULT_BRAND.LogoUrl);
        result = result.replace(/\{\{\s*Brand\.WhiteLogoUrl\s*\}\}/gi, brand.WhiteLogoUrl || brand.LogoUrl || DEFAULT_BRAND.WhiteLogoUrl);
        result = result.replace(/\{\{\s*Brand\.FaviconUrl\s*\}\}/gi, brand.FaviconUrl || DEFAULT_BRAND.FaviconUrl);
        result = result.replace(/\{\{\s*Brand\.WebsiteUrl\s*\}\}/gi, brand.WebsiteUrl || DEFAULT_BRAND.WebsiteUrl);
        result = result.replace(/\{\{\s*Brand\.Name\s*\}\}/gi, brand.Name || data.CompanyName || DEFAULT_BRAND.Name);
        result = result.replace(/\{\{\s*Brand\.LoginButtonText\s*\}\}/gi, brand.LoginButtonText || DEFAULT_BRAND.LoginButtonText);
        result = result.replace(/\{\{\s*Brand\.RegisterButtonText\s*\}\}/gi, brand.RegisterButtonText || DEFAULT_BRAND.RegisterButtonText);
        result = result.replace(/\{\{\s*Brand\.PhoneNumber\s*\}\}/gi, brand.PhoneNumber || DEFAULT_BRAND.PhoneNumber);
        result = result.replace(/\{\{\s*Brand\.EmailAddress\s*\}\}/gi, brand.EmailAddress || DEFAULT_BRAND.EmailAddress);
        result = result.replace(/\{\{\s*Brand\.Address\s*\}\}/gi, brand.Address || DEFAULT_BRAND.Address);

        result = result.replace(/\{\{\s*CompanyName\s*\}\}/gi, data.CompanyName || brand.Name || DEFAULT_BRAND.Name);
        result = result.replace(/\{\{\s*CompanyEmail\s*\}\}/gi, data.CompanyEmail || brand.EmailAddress || DEFAULT_BRAND.EmailAddress);
        result = result.replace(/\{\{\s*CompanyPhone\s*\}\}/gi, data.CompanyPhone || brand.PhoneNumber || DEFAULT_BRAND.PhoneNumber);

        // ---------------------------------------------------------------------
        // 4. TIER 4: SCALAR ROOT TOKENS
        // ---------------------------------------------------------------------
        Object.keys(data).forEach(function (k) {
            var val = data[k];
            if (typeof val === 'string' || typeof val === 'number') {
                var reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
                result = result.replace(reg, val);
            }
        });

        // ---------------------------------------------------------------------
        // 5. TIER 5: SMART FALLBACKS & RESILIENT CLEANUP
        // ---------------------------------------------------------------------
        result = result.replace(/\{\{\s*Title\s*\}\}/gi, 'Empower Your Digital Growth with Modern Architecture');
        result = result.replace(/\{\{\s*MiniTitle\s*\}\}/gi, 'Next-Generation Capability');
        result = result.replace(/\{\{\s*Description\s*\}\}/gi, 'Transform complex workflows into seamless, high-velocity digital experiences with zero architectural overhead.');
        result = result.replace(/\{\{\s*MoreDescription\s*\}\}/gi, 'Engineered for reliability, modular flexibility, and lightning-fast global responsiveness.');
        result = result.replace(/\{\{\s*ButtonText\s*\}\}/gi, 'Get Started Today');
        result = result.replace(/\{\{\s*ButtonLink\s*\}\}/gi, '#');
        result = result.replace(/\{\{\s*SecondButtonText\s*\}\}/gi, 'Watch Product Tour');
        result = result.replace(/\{\{\s*SecondButtonLink\s*\}\}/gi, '#');
        result = result.replace(/\{\{\s*IconText\s*\}\}/gi, 'fa-solid fa-arrow-right');
        result = result.replace(/\{\{\s*ImageUrl\s*\}\}/gi, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000');
        result = result.replace(/\{\{\s*BannerImage\s*\}\}/gi, 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200');
        result = result.replace(/\{\{\s*VideoUrl\s*\}\}/gi, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        result = result.replace(/\{\{\s*DirectUrl\s*\}\}/gi, '#');
        result = result.replace(/\{\{\s*Year\s*\}\}/gi, new Date().getFullYear());
        result = result.replace(/\{\{\s*CopyrightText\s*\}\}/gi, `© ${new Date().getFullYear()} ${brand.Name}. All rights reserved.`);

        // Clean up remaining conditionals and unresolved tags
        result = result.replace(/\{\{#(?:if|unless)\s+[\w\.\-]+\}\}/gi, '');
        result = result.replace(/\{\{\/(?:if|unless)\}\}/gi, '');
        result = result.replace(/\{\{#each\s+[\w\.\-]+\}\}/gi, '');
        result = result.replace(/\{\{\/each\}\}/gi, '');

        // Strip any dangling {{...}} tokens that have no mapping
        result = result.replace(/\{\{[a-zA-Z0-9_\-\.]+\}\}/g, '');

        return result;
    }

    /**
     * Compiles a single modular section into a full, self-contained HTML5 sandbox document.
     * @param {object} section - Section data object.
     * @param {object} options - Compilation options (canvasTheme, suiteCompiledCssUrl, etc.)
     * @returns {string} Standalone HTML document ready for iframe rendering.
     */
    function compileSectionDocument(section, options) {
        if (!section) return '<!DOCTYPE html><html><body><p>No section data provided.</p></body></html>';

        options = options || {};
        var isDark = options.canvasTheme === 'dark';
        var canvasBg = isDark ? '#0b0f19' : '#ffffff';
        var canvasColor = isDark ? '#f8fafc' : '#111827';
        var suiteCssUrl = options.suiteCompiledCssUrl || '';

        // Hydrate HTML
        var hydratedHtml = hydrateTemplate(section.htmlTemplate || '', section.sampleContentJson || '{}');

        // Resolve external library dependencies
        var resolvedAssets = { css: [], js: [], autoInits: [] };
        if (typeof SectionLibraryResolver !== 'undefined' && SectionLibraryResolver.resolveAssets) {
            resolvedAssets = SectionLibraryResolver.resolveAssets(section.requiredLibraries || []);
        }

        // Build CDN link tags
        var fontLinks = [
            '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
        ].join('\n    ');

        var standardIcons = [
            '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">',
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">'
        ].join('\n    ');

        var libCssTags = resolvedAssets.css.map(function (url) {
            return `<link rel="stylesheet" href="${url}">`;
        }).join('\n    ');

        var suiteCssTag = suiteCssUrl ? `<link rel="stylesheet" href="${suiteCssUrl}">` : '';

        var libJsTags = resolvedAssets.js.map(function (url) {
            return `<script src="${url}"><\/script>`;
        }).join('\n    ');

        var autoInitsJs = resolvedAssets.autoInits.length > 0 ? resolvedAssets.autoInits.join('\n        ') : '';

        var sectionJs = (section.jsScript || '').trim();

        // Build complete standalone HTML5 document
        return `<!DOCTYPE html>
<html lang="en" data-theme="${isDark ? 'dark' : 'light'}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${section.name || 'Modular Section Preview'}</title>
    ${fontLinks}
    ${standardIcons}
    ${libCssTags}
    ${suiteCssTag}
    <style>
        :root {
            --oz-canvas-bg: ${canvasBg};
            --oz-canvas-text: ${canvasColor};
            --oz-primary: #ec4899;
            --oz-primary-hover: #db2777;
            --oz-font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        *, *::before, *::after {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: var(--oz-canvas-bg);
            color: var(--oz-canvas-text);
            font-family: var(--oz-font-main);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow-x: hidden;
            min-height: 100vh;
        }
        /* Scoped Component CSS */
        ${section.scopedCss || ''}
    </style>
</head>
<body>
    <!-- Rendered Section Container -->
    <main id="sectionPreviewRoot" class="oz-section-root">
        ${hydratedHtml}
    </main>

    <!-- Third-Party Library Scripts -->
    ${libJsTags}

    <!-- Component Lifecycle Execution & Sandboxed Script -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 1. Library Auto-initializers
            try {
                ${autoInitsJs}
            } catch (initErr) {
                console.warn('[Sandbox AutoInit Notice]:', initErr);
            }

            // 2. Section Custom Script
            try {
                (function(sectionId) {
                    ${sectionJs}
                })('${section.variantCode || 'sec'}');
            } catch (scriptErr) {
                console.warn('[Sandbox Section Script Warning]:', scriptErr);
            }

            // 3. Trigger Resize Event for Dynamic Layouts (Swiper, Isotope, Masonry)
            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            }, 150);
        });
    <\/script>
</body>
</html>`;
    }

    /**
     * Compiles multiple modular sections into a unified, zero-collision Full Page document.
     * @param {Array<object>} sections - Ordered array of section objects.
     * @param {object} options - Page options (title, canvasTheme, suiteCompiledCssUrl, metaTags).
     * @returns {string} Standalone Full Page HTML document.
     */
    function compilePageDocument(sections, options) {
        if (!Array.isArray(sections) || sections.length === 0) {
            return '<!DOCTYPE html><html><body><p>No sections to assemble.</p></body></html>';
        }

        options = options || {};
        var isDark = options.canvasTheme === 'dark';
        var canvasBg = isDark ? '#0b0f19' : '#ffffff';
        var canvasColor = isDark ? '#f8fafc' : '#111827';
        var suiteCssUrl = options.suiteCompiledCssUrl || '';
        var pageTitle = options.pageTitle || 'Modular Website Preview';

        // Collect and de-duplicate all required libraries across all sections
        var allLibraries = [];
        sections.forEach(function (sec) {
            if (Array.isArray(sec.requiredLibraries)) {
                allLibraries = allLibraries.concat(sec.requiredLibraries);
            }
        });

        var resolvedAssets = { css: [], js: [], autoInits: [] };
        if (typeof SectionLibraryResolver !== 'undefined' && SectionLibraryResolver.resolveAssets) {
            resolvedAssets = SectionLibraryResolver.resolveAssets(allLibraries);
        }

        var fontLinks = [
            '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
            '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
        ].join('\n    ');

        var standardIcons = [
            '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">',
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">'
        ].join('\n    ');

        var libCssTags = resolvedAssets.css.map(function (url) {
            return `<link rel="stylesheet" href="${url}">`;
        }).join('\n    ');

        var suiteCssTag = suiteCssUrl ? `<link rel="stylesheet" href="${suiteCssUrl}">` : '';

        var libJsTags = resolvedAssets.js.map(function (url) {
            return `<script src="${url}"><\/script>`;
        }).join('\n    ');

        var autoInitsJs = resolvedAssets.autoInits.length > 0 ? resolvedAssets.autoInits.join('\n        ') : '';

        // Combine all section HTML, scoped CSS, and scripts
        var combinedCss = [];
        var combinedHtml = [];
        var combinedScripts = [];

        sections.forEach(function (sec, idx) {
            var secId = sec.variantCode || ('sec_' + idx);
            if (sec.scopedCss) {
                combinedCss.push(`/* Section: ${sec.name || secId} */\n` + sec.scopedCss);
            }
            var hydrated = hydrateTemplate(sec.htmlTemplate || '', sec.sampleContentJson || '{}');
            combinedHtml.push(`<!-- Section: ${sec.name || secId} -->\n<div id="wrapper_${secId}" class="oz-page-section-wrapper">\n${hydrated}\n</div>`);

            if (sec.jsScript && sec.jsScript.trim()) {
                combinedScripts.push(`
            // Section Script: ${sec.name || secId}
            try {
                (function(sectionId) {
                    ${sec.jsScript.trim()}
                })('${secId}');
            } catch (secErr_${idx}) {
                console.warn('[Page Section Script Warning - ${secId}]:', secErr_${idx});
            }`);
            }
        });

        return `<!DOCTYPE html>
<html lang="en" data-theme="${isDark ? 'dark' : 'light'}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    ${fontLinks}
    ${standardIcons}
    ${libCssTags}
    ${suiteCssTag}
    <style>
        :root {
            --oz-canvas-bg: ${canvasBg};
            --oz-canvas-text: ${canvasColor};
            --oz-primary: #ec4899;
            --oz-font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        *, *::before, *::after {
            box-sizing: border-box;
        }
        html, body {
            margin: 0;
            padding: 0;
            background: var(--oz-canvas-bg);
            color: var(--oz-canvas-text);
            font-family: var(--oz-font-main);
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            min-height: 100vh;
        }
        ${combinedCss.join('\n\n')}
    </style>
</head>
<body>
    <div id="ozikolPageRoot" class="oz-page-root">
        ${combinedHtml.join('\n\n')}
    </div>

    ${libJsTags}

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            try {
                ${autoInitsJs}
            } catch (autoErr) {
                console.warn('[Page AutoInit Warning]:', autoErr);
            }

            ${combinedScripts.join('\n')}

            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            }, 200);
        });
    <\/script>
</body>
</html>`;
    }

    return {
        hydrateTemplate: hydrateTemplate,
        compileSectionDocument: compileSectionDocument,
        compilePageDocument: compilePageDocument,
        parseContentJson: parseContentJson
    };
})();
