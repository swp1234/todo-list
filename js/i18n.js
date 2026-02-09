/**
 * I18n (Internationalization) Module
 * Supports 12 languages: ko, en, ja, zh, es, pt, id, tr, de, fr, hi, ru
 */

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
        this.currentLang = this.detectLanguage();
        this.loadedLanguages = new Set();
    }

    /**
     * Detect user's preferred language
     * Priority: localStorage > browser > default (en)
     */
    detectLanguage() {
        // Check localStorage
        const savedLang = localStorage.getItem('selectedLanguage');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to English
        return 'en';
    }

    /**
     * Load translation JSON file
     */
    async loadTranslations(lang) {
        if (this.loadedLanguages.has(lang)) {
            return this.translations[lang];
        }

        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}`);
            this.translations[lang] = await response.json();
            this.loadedLanguages.add(lang);
            return this.translations[lang];
        } catch (error) {
            console.error(`Error loading language ${lang}:`, error);
            // Fallback to English
            if (lang !== 'en') {
                return this.loadTranslations('en');
            }
            return {};
        }
    }

    /**
     * Get translation for key (dot notation)
     * Example: t('button.save') returns translations['button']['save']
     */
    t(key) {
        if (!this.translations[this.currentLang]) {
            return key;
        }

        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }

        return typeof value === 'string' ? value : key;
    }

    /**
     * Set active language and update UI
     */
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language ${lang} not supported`);
            return;
        }

        await this.loadTranslations(lang);
        this.currentLang = lang;
        localStorage.setItem('selectedLanguage', lang);
        this.updateUI();

        // Dispatch event for app to respond
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    /**
     * Update all UI elements with data-i18n attribute
     */
    updateUI() {
        // Update text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
    }

    /**
     * Initialize i18n: load current language and update UI
     */
    async init() {
        await this.loadTranslations(this.currentLang);
        this.updateUI();
        this.setupLanguageSelector();
    }

    /**
     * Setup language selector event listeners
     */
    setupLanguageSelector() {
        const langToggle = document.getElementById('lang-toggle');
        const langMenu = document.getElementById('lang-menu');

        if (!langToggle || !langMenu) return;

        // Toggle menu
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            langMenu.classList.add('hidden');
        });

        // Language selection
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lang = btn.getAttribute('data-lang');
                await this.setLanguage(lang);
                langMenu.classList.add('hidden');
            });
        });
    }

    /**
     * Get current language code
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Get human-readable language name
     */
    getLanguageName(lang) {
        const names = {
            ko: '한국어',
            en: 'English',
            ja: '日本語',
            zh: '中文',
            es: 'Español',
            pt: 'Português',
            id: 'Bahasa Indonesia',
            tr: 'Türkçe',
            de: 'Deutsch',
            fr: 'Français',
            hi: 'हिन्दी',
            ru: 'Русский'
        };
        return names[lang] || lang;
    }

    /**
     * Format number according to locale
     */
    formatNumber(num) {
        return new Intl.NumberFormat(this.currentLang).format(num);
    }

    /**
     * Format date according to locale
     */
    formatDate(date) {
        return new Intl.DateTimeFormat(this.currentLang, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }

    /**
     * Format date with time
     */
    formatDateTime(date) {
        return new Intl.DateTimeFormat(this.currentLang, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
}

// Create global i18n instance
const i18n = new I18n();

// Initialize i18n when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}
