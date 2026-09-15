import { Injectable } from '@angular/core';

/**
 * Service responsible for asynchronously loading Monaco Editor via AMD from CDN,
 * registering custom Ozikol Monarch grammar tokenization, and defining the dark studio theme.
 */
@Injectable({
  providedIn: 'root'
})
export class MonacoLoaderService {
  private monacoLoadingPromise?: Promise<any>;

  /**
   * Dynamically loads the Monaco Editor AMD loader script from CDN.
   * Once loaded, configures Monaco AMD paths, registers the Ozikol studio theme, and resolves with the global monaco object.
   * Caches the promise to ensure idempotent, thread-safe loading across multiple components.
   * @returns A promise resolving to the monaco namespace.
   */
  loadMonaco(): Promise<any> {
    if ((window as any).monaco) {
      this.registerOzikolMonacoLanguageAndTheme((window as any).monaco);
      return Promise.resolve((window as any).monaco);
    }

    if (this.monacoLoadingPromise) {
      return this.monacoLoadingPromise;
    }

    this.monacoLoadingPromise = new Promise((resolve, reject) => {
      const scriptId = 'monaco-amd-loader-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const onAmdLoaded = () => {
        const amdRequire = (window as any).require;
        if (!amdRequire) {
          reject(new Error('Monaco AMD loader require function not available.'));
          return;
        }
        amdRequire.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
        });
        amdRequire(['vs/editor/editor.main'], () => {
          if ((window as any).monaco) {
            this.registerOzikolMonacoLanguageAndTheme((window as any).monaco);
            resolve((window as any).monaco);
          } else {
            reject(new Error('Monaco namespace failed to initialize.'));
          }
        });
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        script.onload = () => onAmdLoaded();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      } else {
        if ((window as any).require) {
          onAmdLoaded();
        } else {
          script.addEventListener('load', () => onAmdLoaded());
        }
      }
    });

    return this.monacoLoadingPromise;
  }

  /**
   * Registers custom Monarch syntax tokenization rules and theme styling for Monaco Editor.
   * Deliberately differentiates:
   * 1. HTML Tags / Divs in vibrant Electric Cyan (#38bdf8, bold)
   * 2. Class attributes in Violet (#c084fc) and class values in Bright Emerald Green (#34d399, bold)
   * 3. Placeholders in Neon Fuchsia (#e879f9) and Rose loop blocks (#f43f5e)
   * 4. Normal content / plain text in Crisp White (#ffffff)
   * 5. Other attributes in Amber (#fbbf24) and Coral (#fb923c)
   * @param monaco The global monaco instance loaded via AMD.
   */
  registerOzikolMonacoLanguageAndTheme(monaco: any): void {
    if (!monaco || (monaco as any).__ozikolThemeRegistered) return;
    (monaco as any).__ozikolThemeRegistered = true;

    try {
      // 1. Set custom Monarch tokens provider for 'html' to isolate tags, classes, placeholders, and normal content
      monaco.languages.setMonarchTokensProvider('html', {
        defaultToken: '',
        tokenPostfix: '.html',
        ignoreCase: true,
        tokenizer: {
          root: [
            // Handlebars template comments: {{!-- ... --}} or {{! ... }}
            [/\{\{!--[\s\S]*?--\}\}/, 'comment.block'],
            [/\{\{!.*?\}\}/, 'comment.doc'],
            [/<!--/, 'comment', '@comment'],

            // Handlebars template loop/conditional blocks: {{#each ...}}, {{/each}}, {{#if ...}}, {{/if}}, {{else}}
            [/\{\{\s*[#\/^][\w\s\.\-_]+\}\}/, 'custom-placeholder-block'],
            [/\{\{\s*else\s*\}\}/, 'custom-placeholder-block'],

            // Handlebars variable placeholders: {{ BrandIdentity }}, {{ Url }}, {{ Title }}
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],

            // Doctype
            [/<!DOCTYPE/i, 'metatag', '@doctype'],

            // HTML Opening and Closing Tags (<div, </div, <header, </header, etc.)
            [/(<\/)([a-zA-Z][\w\-]*)/, ['custom-tag-delimiter', { token: 'custom-tag-name', next: '@tag' }]],
            [/(<)([a-zA-Z][\w\-]*)/, ['custom-tag-delimiter', { token: 'custom-tag-name', next: '@tag' }]],

            // Tag delimiter
            [/</, 'custom-tag-delimiter'],

            // Normal content / plain text between tags
            [/[^<{]+/, 'custom-content'],
            [/\{/, 'custom-content']
          ],

          doctype: [
            [/[^>]+/, 'metatag.content'],
            [/>/, 'metatag', '@pop']
          ],

          comment: [
            [/-->/, 'comment', '@pop'],
            [/[^-]+/, 'comment'],
            [/[-]/, 'comment']
          ],

          tag: [
            // Tag closing
            [/>/, 'custom-tag-delimiter', '@pop'],
            [/\/>/, 'custom-tag-delimiter', '@pop'],

            // Placeholder inside tag or attributes
            [/\{\{\s*[#\/^][\w\s\.\-_]+\}\}/, 'custom-placeholder-block'],
            [/\{\{\s*[\w\s\.\-_]+\}\}/, 'custom-placeholder-token'],

            // class="value" or class='value'
            [/(class)(\s*=\s*)(")([^"]*)(")/, ['custom-attr-class', 'delimiter', 'string', 'custom-class-value', 'string']],
            [/(class)(\s*=\s*)(')([^']*)(')/, ['custom-attr-class', 'delimiter', 'string', 'custom-class-value', 'string']],

            // id="value"
            [/(id)(\s*=\s*)(")([^"]*)(")/, ['custom-attr-id', 'delimiter', 'string', 'custom-id-value', 'string']],
            [/(id)(\s*=\s*)(')([^']*)(')/, ['custom-attr-id', 'delimiter', 'string', 'custom-id-value', 'string']],

            // href / src / style
            [/([a-zA-Z\-:]+)(\s*=\s*)(")([^"]*)(")/, ['custom-attr-name', 'delimiter', 'string', 'string.value', 'string']],
            [/([a-zA-Z\-:]+)(\s*=\s*)(')([^']*)(')/, ['custom-attr-name', 'delimiter', 'string', 'string.value', 'string']],

            // Boolean or value-less attributes
            [/[a-zA-Z\-:]+/, 'custom-attr-name'],

            // Whitespace
            [/\s+/]
          ]
        }
      });

      // 2. Define custom high-contrast dark theme isolating tags, classes, and placeholders
      monaco.editor.defineTheme('ozikol-studio-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          // Background & general
          { token: '', foreground: 'f8fafc', background: '0d1117' },
          { token: 'custom-content', foreground: 'ffffff' },

          // HTML Tags & Tag Delimiters (Cyan #38bdf8, bold)
          { token: 'custom-tag-name', foreground: '38bdf8', fontStyle: 'bold' },
          { token: 'custom-tag-delimiter', foreground: '0284c7', fontStyle: 'bold' },

          // Classes (Violet attribute name #c084fc, Emerald Green value #34d399 bold)
          { token: 'custom-attr-class', foreground: 'c084fc', fontStyle: 'italic' },
          { token: 'custom-class-value', foreground: '34d399', fontStyle: 'bold' },

          // IDs (Amber attribute name #fbbf24, Bright Yellow value #fde047)
          { token: 'custom-attr-id', foreground: 'fbbf24', fontStyle: 'italic' },
          { token: 'custom-id-value', foreground: 'fde047', fontStyle: 'bold' },

          // Other attributes (Coral #fb923c attribute name, Ice Blue string values #93c5fd)
          { token: 'custom-attr-name', foreground: 'fb923c' },
          { token: 'string.value', foreground: '93c5fd' },
          { token: 'string', foreground: '93c5fd' },

          // Placeholders & Loops (Neon Fuchsia token #e879f9 bold, Rose loop block #f43f5e bold)
          { token: 'custom-placeholder-token', foreground: 'e879f9', fontStyle: 'bold' },
          { token: 'custom-placeholder-block', foreground: 'f43f5e', fontStyle: 'bold' },

          // Comments (Muted Slate #64748b italic)
          { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
          { token: 'comment.block', foreground: '64748b', fontStyle: 'italic' },
          { token: 'comment.doc', foreground: '64748b', fontStyle: 'italic' },

          // Metatags / Doctype (Indigo #818cf8)
          { token: 'metatag', foreground: '818cf8', fontStyle: 'bold' },
          { token: 'metatag.content', foreground: '818cf8' },
          { token: 'delimiter', foreground: '94a3b8' }
        ],
        colors: {
          'editor.background': '#0b0f19',
          'editor.foreground': '#f8fafc',
          'editorCursor.foreground': '#38bdf8',
          'editor.lineHighlightBackground': '#141c2e',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#38bdf8',
          'editor.selectionBackground': '#1e293b',
          'editor.inactiveSelectionBackground': '#0f172a',
          'editorIndentGuide.background': '#1e293b',
          'editorIndentGuide.activeBackground': '#334155',
          'editorGutter.foldingControlForeground': '#38bdf8'
        }
      });

      monaco.editor.setTheme('ozikol-studio-dark');
    } catch (e) {
      console.warn('Could not customize Monaco tokens or theme:', e);
    }
  }
}
