/**
 * Section Library Resolver (Client-Side Hub)
 * Automatically detects third-party CSS/JS library signatures and injects required CDN bundles into preview iframes.
 */
const SectionLibraryResolver = (function () {
    const catalog = {
        bootstrap: {
            name: "Bootstrap 5.3",
            css: ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"],
            js: ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"]
        },
        swiper: {
            name: "Swiper v11",
            css: ["https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"],
            js: ["https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"]
        },
        aos: {
            name: "AOS Animations",
            css: ["https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css"],
            js: ["https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"],
            autoInit: "if (typeof AOS !== 'undefined') { AOS.init({ duration: 800, once: true }); }"
        },
        glightbox: {
            name: "GLightbox Media",
            css: ["https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css"],
            js: ["https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js"],
            autoInit: "if (typeof GLightbox !== 'undefined') { window._gLightboxes = window._gLightboxes || []; window._gLightboxes.push(GLightbox({ selector: '.glightbox' })); }"
        },
        fontawesome: {
            name: "Font Awesome 6.5",
            css: ["https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"],
            js: []
        },
        "bootstrap-icons": {
            name: "Bootstrap Icons",
            css: ["https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"],
            js: []
        },
        "material-symbols": {
            name: "Material Symbols",
            css: ["https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"],
            js: []
        },
        purecounter: {
            name: "PureCounter Vanilla",
            css: [],
            js: ["https://cdn.jsdelivr.net/npm/@srexi/purecounterjs/dist/purecounter_vanilla.js"],
            autoInit: "if (typeof PureCounter !== 'undefined') { new PureCounter(); }"
        },
        typed: {
            name: "Typed.js",
            css: [],
            js: ["https://cdn.jsdelivr.net/npm/typed.js@2.0.12"]
        },
        isotope: {
            name: "Isotope Grid",
            css: [],
            js: ["https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js"]
        },
        odometer: {
            name: "Odometer Counter",
            css: ["https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/themes/odometer-theme-default.min.css"],
            js: ["https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/odometer.min.js"],
            autoInit: "document.querySelectorAll('.odometer[data-count]').forEach(el => { const val = el.getAttribute('data-count'); if (val) setTimeout(() => { el.innerHTML = val; }, 300); });"
        }
    };

    /**
     * Detects required libraries from HTML and JS content.
     */
    function detectLibraries(html, js) {
        const detected = new Set();
        const combined = (html || "") + " " + (js || "");

        if (/\b(container|container-fluid|row|col|col-\w+|d-flex|modal|dropdown|accordion|navbar|btn-primary|data-bs-|bootstrap\.)\b/i.test(combined)) {
            detected.add("bootstrap");
        }
        if (/\b(swiper|swiper-slide|swiper-wrapper|swiper-pagination|swiper-button-|new\s+Swiper)\b/i.test(combined)) {
            detected.add("swiper");
        }
        if (/data-aos|aos-animate|AOS\.init/i.test(combined)) {
            detected.add("aos");
        }
        if (/\b(glightbox|fancybox|data-gallery|data-glightbox|GLightbox\()\b/i.test(combined)) {
            detected.add("glightbox");
        }
        if (/\b(fa|fas|far|fab|fa-solid|fa-brands|fa-regular|fa-\w+)\b/i.test(combined)) {
            detected.add("fontawesome");
        }
        if (/\b(bi|bi-\w+)\b/i.test(combined)) {
            detected.add("bootstrap-icons");
        }
        if (/material-symbols-outlined|material-icons/i.test(combined)) {
            detected.add("material-symbols");
        }
        if (/\b(purecounter|counter-up|data-purecounter-|new\s+PureCounter)\b/i.test(combined)) {
            detected.add("purecounter");
        }
        if (/\b(odometer|odometer-auto-theme|data-count|new\s+Odometer)\b/i.test(combined)) {
            detected.add("odometer");
        }
        if (/typed|data-typed-items|new Typed/i.test(combined)) {
            detected.add("typed");
        }
        if (/\b(isotope-container|isotope-item|portfolio-container|portfolio-filters|new\s+Isotope)\b/i.test(combined)) {
            detected.add("isotope");
        }

        return Array.from(detected);
    }

    /**
     * Resolves all CDN asset URLs and initializers for given library keys.
     */
    function resolveAssets(libraryKeys) {
        const cssUrls = [];
        const jsUrls = [];
        const autoInits = [];

        (libraryKeys || []).forEach(key => {
            const def = catalog[key.toLowerCase()];
            if (def) {
                if (def.css) cssUrls.push(...def.css);
                if (def.js) jsUrls.push(...def.js);
                if (def.autoInit) autoInits.push(def.autoInit);
            }
        });

        return {
            css: Array.from(new Set(cssUrls)),
            js: Array.from(new Set(jsUrls)),
            autoInits: Array.from(new Set(autoInits))
        };
    }

    /**
     * Injects resolved CSS links, scripts, scoped styles, and isolated section JS into an iframe document.
     */
    function injectIntoIframe(iframeDoc, sectionPayload, callback) {
        if (!iframeDoc) return;

        const detectedLibs = sectionPayload.requiredLibraries || detectLibraries(sectionPayload.htmlTemplate, sectionPayload.jsScript);
        const assets = resolveAssets(detectedLibs);

        // 1. Build head markup
        const headLinks = assets.css.map(url => `<link rel="stylesheet" href="${url}">`).join("\n");
        const scopedCssTag = sectionPayload.scopedCss ? `<style>${sectionPayload.scopedCss}</style>` : "";

        // 2. Build scripts markup
        const scriptTags = assets.js.map(url => `<script src="${url}"><\/script>`).join("\n");
        const initsTag = assets.autoInits.length ? `<script>document.addEventListener('DOMContentLoaded', function() { ${assets.autoInits.join("\n")} });<\/script>` : "";
        const isolatedJsTag = sectionPayload.jsScript ? `<script>(function() { try { ${sectionPayload.jsScript} } catch(e) { console.warn('Section JS execution warning:', e); } })();<\/script>` : "";

        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                ${headLinks}
                ${scopedCssTag}
                <style>
                    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }
                </style>
            </head>
            <body>
                ${sectionPayload.renderedHtml || sectionPayload.htmlTemplate}
                ${scriptTags}
                ${initsTag}
                ${isolatedJsTag}
            </body>
            </html>
        `);
        iframeDoc.close();

        if (typeof callback === "function") {
            setTimeout(callback, 100);
        }
    }

    return {
        catalog,
        detectLibraries,
        resolveAssets,
        injectIntoIframe
    };
})();
