import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type SupportedLanguage = 'en' | 'fr' | 'es' | 'de';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', shortLabel: '🇬🇧 EN' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', shortLabel: '🇫🇷 FR' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', shortLabel: '🇪🇸 ES' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', shortLabel: '🇩🇪 DE' }
];

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'bcp_language';
  private currentLangSubject = new BehaviorSubject<SupportedLanguage>(this.getInitialLanguage());
  public currentLang$: Observable<SupportedLanguage> = this.currentLangSubject.asObservable();

  private translations: Record<SupportedLanguage, Record<string, string>> = {
    en: {
      // Shell & Mode Navigation
      'shell.console': 'Console',
      'shell.workspace': 'Workspace',
      'shell.admin_console': 'Administration Console',
      'shell.users_workspace': 'Users Workspace',
      'shell.switch_to_workspace': 'Switch to Users Workspace',
      'shell.switch_to_console': 'Switch to Admin Console',
      'shell.search_placeholder': 'Search workspace...',
      'shell.help_support': 'Help & Support',
      'shell.sign_out': 'Sign Out',
      'shell.powered_by': 'Powered by Ozikol',
      'shell.workspace_vault': 'Workspace Vault',
      'shell.pin_nav': 'Pin Navigation',

      // Navigation Groups & Items
      'nav.website': 'Website',
      'nav.home': 'Home',
      'nav.link_domain': 'Link Domain',
      'nav.manage_domain': 'Manage Domain',
      'nav.command_center': 'Command Center',
      'nav.console_dashboard': 'Console Dashboard',
      'nav.workspace_home': 'Workspace Home',
      'nav.feature_billing': 'Feature Billing',
      'nav.security_audit': 'Security Audit',
      'nav.cms_studio': 'CMS Studio',
      'nav.cms_dashboard': 'CMS Dashboard',
      'nav.web_categories': 'Web Categories',
      'nav.all_web_pages': 'All Web Pages',
      'nav.blog_articles': 'Blog Articles',
      'nav.blog_categories': 'Blog Categories',
      'nav.manage_forms': 'Manage Forms',
      'nav.my_templates': 'My Templates',
      'nav.ui_marketplace': 'UI Marketplace',
      'nav.brand_settings': 'Brand & Settings',
      'nav.custom_domain': 'Custom Domain',
      'nav.commerce_studio': 'Commerce Studio',
      'nav.products_catalog': 'Products Catalog',
      'nav.create_product': 'Create Product',
      'nav.user_management': 'User Management',
      'nav.user_directory': 'User Directory',
      'nav.all_members': 'All Members',
      'nav.registration_form_builder': 'Registration Form Builder',
      'nav.kpis_leaderboard': 'KPIs & Leaderboard',
      'nav.activity_audit_logs': 'Activity Audit Logs',
      'nav.notification_studio': 'Notification Studio',
      'nav.people_community': 'People & Community',
      'nav.chat_messenger': 'Ozikol Chat Messenger',
      'nav.calendar_followups': 'Calendar & Follow-Ups',
      'nav.gocall_dispatch': 'GoCall AI Dispatch',
      'nav.my_profile': 'My Profile',
      'nav.my_cv_biography': 'My CV Biography',
      'nav.my_kpis': 'My KPIs & Performance',
      'nav.my_purchases': 'My Purchases',
      'nav.security_password': 'Security & Password',
      'nav.notifications_alerts': 'Notifications & Alerts',
      'nav.groups_directory': 'Groups Directory',
      'nav.alumni_network': 'Alumni Network',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Refresh Telemetry',
      'btn.new_web_page': 'New Web Page',
      'btn.create_dynamic_page': 'Create Dynamic Web Page',
      'btn.register_new_member': 'Register New Member',
      'btn.create_group_channel': 'Create Group Channel',
      'btn.brand_customizer': 'Brand & Theme Customizer',
      'btn.telemetry_log': 'Telemetry Log',
      'btn.view_directory': 'View Directory →',
      'btn.save_changes': 'Save Changes',
      'btn.cancel': 'Cancel',
      'btn.continue': 'Continue',
      'btn.close': 'Close',
      'btn.review_entitlements': 'Review Entitlements',
      'btn.manage_subscriptions': 'Manage Subscriptions',
      'btn.retry': 'Retry',

      // Health Counters & KPIs
      'kpi.core_performance': 'Core Performance & Health Counters',
      'kpi.all_services_operational': 'All Services Operational',
      'kpi.total_members': 'TOTAL MEMBERS',
      'kpi.group_channels': 'GROUP CHANNELS',
      'kpi.published_pages': 'PUBLISHED PAGES',
      'kpi.hero_sliders': 'HERO SLIDERS',
      'kpi.active_faqs': 'ACTIVE FAQS',
      'kpi.platform_roles': 'PLATFORM ROLES',
      'kpi.recently_registered': 'Recently Registered Members',
      'kpi.quick_actions': 'Quick Actions & Shortcuts',
      'kpi.recent_activity': 'Recent Activity & Audit Trail',

      // Alerts & Notes
      'alert.central_subscription_notice': 'Central Feature Subscription Notice:',
      'alert.offline_notice': 'You are offline. Showing cached workspace data.',
      'alert.admin_only_notice': 'Organization capabilities are governed by Central Master Catalog licenses.',

      // Badges
      'badge.live': 'LIVE',
      'badge.soon': 'SOON',
      'badge.new': 'NEW',
      'badge.hot': 'HOT',
      'badge.active': 'Active',
      'badge.setup': 'Setup',
      'badge.licenses': 'LICENSES'
    },

    fr: {
      // Shell & Mode Navigation
      'shell.console': 'Console',
      'shell.workspace': 'Espace',
      'shell.admin_console': 'Console d’Administration',
      'shell.users_workspace': 'Espace Utilisateurs',
      'shell.switch_to_workspace': 'Basculer vers l’Espace Utilisateurs',
      'shell.switch_to_console': 'Basculer vers la Console d’Administration',
      'shell.search_placeholder': 'Rechercher dans l’espace...',
      'shell.help_support': 'Aide & Assistance',
      'shell.sign_out': 'Se déconnecter',
      'shell.powered_by': 'Propulsé par Ozikol',
      'shell.workspace_vault': 'Coffre-fort de l’espace',
      'shell.pin_nav': 'Navigation Épinglée',

      // Navigation Groups & Items
      'nav.website': 'Site Web',
      'nav.home': 'Accueil',
      'nav.link_domain': 'Lier un Domaine',
      'nav.manage_domain': 'Gérer le Domaine',
      'nav.command_center': 'Centre de Commande',
      'nav.console_dashboard': 'Tableau de bord Console',
      'nav.workspace_home': 'Accueil Espace',
      'nav.feature_billing': 'Facturation des Fonctionnalités',
      'nav.security_audit': 'Audit de Sécurité',
      'nav.cms_studio': 'Studio CMS',
      'nav.cms_dashboard': 'Tableau de bord CMS',
      'nav.web_categories': 'Catégories Web',
      'nav.all_web_pages': 'Toutes les Pages Web',
      'nav.blog_articles': 'Articles de Blog',
      'nav.blog_categories': 'Catégories de Blog',
      'nav.manage_forms': 'Gérer les Formulaires',
      'nav.my_templates': 'Mes Modèles',
      'nav.ui_marketplace': 'Marché UI',
      'nav.brand_settings': 'Marque & Paramètres',
      'nav.custom_domain': 'Domaine Personnalisé',
      'nav.commerce_studio': 'Studio Commerce',
      'nav.products_catalog': 'Catalogue de Produits',
      'nav.create_product': 'Créer un Produit',
      'nav.user_management': 'Gestion des Utilisateurs',
      'nav.user_directory': 'Répertoire Utilisateurs',
      'nav.all_members': 'Tous les Membres',
      'nav.registration_form_builder': 'Créateur de Formulaires d’Inscription',
      'nav.kpis_leaderboard': 'KPIs & Classement',
      'nav.activity_audit_logs': 'Journaux d’Activité',
      'nav.notification_studio': 'Studio de Notifications',
      'nav.people_community': 'Membres & Communauté',
      'nav.chat_messenger': 'Messagerie Ozikol Chat',
      'nav.calendar_followups': 'Calendrier & Suivis',
      'nav.gocall_dispatch': 'Distribution Vocale GoCall AI',
      'nav.my_profile': 'Mon Profil',
      'nav.my_cv_biography': 'Mon CV & Biographie',
      'nav.my_kpis': 'Mes KPIs & Performance',
      'nav.my_purchases': 'Mes Achats',
      'nav.security_password': 'Sécurité & Mot de Passe',
      'nav.notifications_alerts': 'Notifications & Alertes',
      'nav.groups_directory': 'Répertoire des Groupes',
      'nav.alumni_network': 'Réseau des Anciens',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Actualiser Télémétrie',
      'btn.new_web_page': 'Nouvelle Page Web',
      'btn.create_dynamic_page': 'Créer une Page Web Dynamique',
      'btn.register_new_member': 'Inscrire un Nouveau Membre',
      'btn.create_group_channel': 'Créer un Canal de Groupe',
      'btn.brand_customizer': 'Personnalisateur de Thème & Marque',
      'btn.telemetry_log': 'Journal de Télémétrie',
      'btn.view_directory': 'Voir le Répertoire →',
      'btn.save_changes': 'Enregistrer',
      'btn.cancel': 'Annuler',
      'btn.continue': 'Continuer',
      'btn.close': 'Fermer',
      'btn.review_entitlements': 'Vérifier Abonnements',
      'btn.manage_subscriptions': 'Gérer les Abonnements',
      'btn.retry': 'Réessayer',

      // Health Counters & KPIs
      'kpi.core_performance': 'Compteurs de Performance & Santé Système',
      'kpi.all_services_operational': 'Tous les Services Opérationnels',
      'kpi.total_members': 'TOTAL MEMBRES',
      'kpi.group_channels': 'CANAUX DE GROUPE',
      'kpi.published_pages': 'PAGES PUBLIÉES',
      'kpi.hero_sliders': 'BANNIÈRES HERO',
      'kpi.active_faqs': 'FAQS ACTIVES',
      'kpi.platform_roles': 'RÔLES DE PLATEFORME',
      'kpi.recently_registered': 'Membres Récemment Inscrits',
      'kpi.quick_actions': 'Actions Rapides & Raccourcis',
      'kpi.recent_activity': 'Activité Récente & Piste d’Audit',

      // Alerts & Notes
      'alert.central_subscription_notice': 'Avis d’Abonnement Central:',
      'alert.offline_notice': 'Vous êtes hors ligne. Affichage des données en cache.',
      'alert.admin_only_notice': 'Les capacités de l’organisation sont régies par le catalogue Central.',

      // Badges
      'badge.live': 'EN DIRECT',
      'badge.soon': 'BIENTÔT',
      'badge.new': 'NOUVEAU',
      'badge.hot': 'POPULAIRE',
      'badge.active': 'Actif',
      'badge.setup': 'Config',
      'badge.licenses': 'LICENCES'
    },

    es: {
      // Shell & Mode Navigation
      'shell.console': 'Consola',
      'shell.workspace': 'Espacio',
      'shell.admin_console': 'Consola de Administración',
      'shell.users_workspace': 'Espacio de Usuarios',
      'shell.switch_to_workspace': 'Cambiar al Espacio de Usuarios',
      'shell.switch_to_console': 'Cambiar a la Consola de Administración',
      'shell.search_placeholder': 'Buscar en el espacio...',
      'shell.help_support': 'Ayuda y Soporte',
      'shell.sign_out': 'Cerrar Sesión',
      'shell.powered_by': 'Desarrollado por Ozikol',
      'shell.workspace_vault': 'Bóveda del Espacio',
      'shell.pin_nav': 'Navegación Fijada',

      // Navigation Groups & Items
      'nav.website': 'Sitio Web',
      'nav.home': 'Inicio',
      'nav.link_domain': 'Vincular Dominio',
      'nav.manage_domain': 'Administrar Dominio',
      'nav.command_center': 'Centro de Comando',
      'nav.console_dashboard': 'Panel de Consola',
      'nav.workspace_home': 'Inicio del Espacio',
      'nav.feature_billing': 'Facturación de Módulos',
      'nav.security_audit': 'Auditoría de Seguridad',
      'nav.cms_studio': 'Estudio CMS',
      'nav.cms_dashboard': 'Panel CMS',
      'nav.web_categories': 'Categorías Web',
      'nav.all_web_pages': 'Todas las Páginas Web',
      'nav.blog_articles': 'Artículos del Blog',
      'nav.blog_categories': 'Categorías del Blog',
      'nav.manage_forms': 'Administrar Formularios',
      'nav.my_templates': 'Mis Plantillas',
      'nav.ui_marketplace': 'Mercado de UI',
      'nav.brand_settings': 'Marca y Ajustes',
      'nav.custom_domain': 'Dominio Personalizado',
      'nav.commerce_studio': 'Estudio de Comercio',
      'nav.products_catalog': 'Catálogo de Productos',
      'nav.create_product': 'Crear Producto',
      'nav.user_management': 'Gestión de Usuarios',
      'nav.user_directory': 'Directorio de Usuarios',
      'nav.all_members': 'Todos los Miembros',
      'nav.registration_form_builder': 'Constructor de Formularios',
      'nav.kpis_leaderboard': 'KPIs y Clasificación',
      'nav.activity_audit_logs': 'Registros de Auditoría',
      'nav.notification_studio': 'Estudio de Notificaciones',
      'nav.people_community': 'Personas y Comunidad',
      'nav.chat_messenger': 'Mensajería Ozikol Chat',
      'nav.calendar_followups': 'Calendario y Seguimientos',
      'nav.gocall_dispatch': 'Despacho de Voz GoCall AI',
      'nav.my_profile': 'Mi Perfil',
      'nav.my_cv_biography': 'Mi CV y Biografía',
      'nav.my_kpis': 'Mis KPIs y Desempeño',
      'nav.my_purchases': 'Mis Compras',
      'nav.security_password': 'Seguridad y Contraseña',
      'nav.notifications_alerts': 'Notificaciones y Alertas',
      'nav.groups_directory': 'Directorio de Grupos',
      'nav.alumni_network': 'Red de Exalumnos',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Actualizar Telemetría',
      'btn.new_web_page': 'Nueva Página Web',
      'btn.create_dynamic_page': 'Crear Página Web Dinámica',
      'btn.register_new_member': 'Registrar Nuevo Miembro',
      'btn.create_group_channel': 'Crear Canal de Grupo',
      'btn.brand_customizer': 'Personalizador de Marca y Tema',
      'btn.telemetry_log': 'Registro de Telemetría',
      'btn.view_directory': 'Ver Directorio →',
      'btn.save_changes': 'Guardar Cambios',
      'btn.cancel': 'Cancelar',
      'btn.continue': 'Continuar',
      'btn.close': 'Cerrar',
      'btn.review_entitlements': 'Revisar Suscripciones',
      'btn.manage_subscriptions': 'Administrar Suscripciones',
      'btn.retry': 'Reintentar',

      // Health Counters & KPIs
      'kpi.core_performance': 'Contadores de Rendimiento y Salud',
      'kpi.all_services_operational': 'Todos los Servicios Operativos',
      'kpi.total_members': 'TOTAL MIEMBROS',
      'kpi.group_channels': 'CANALES DE GRUPO',
      'kpi.published_pages': 'PÁGINAS PUBLICADAS',
      'kpi.hero_sliders': 'BANNERS HERO',
      'kpi.active_faqs': 'PREGUNTAS ACTIVAS',
      'kpi.platform_roles': 'ROLES DE PLATAFORMA',
      'kpi.recently_registered': 'Miembros Registrados Recientemente',
      'kpi.quick_actions': 'Acciones Rápidas y Accesos',
      'kpi.recent_activity': 'Actividad Reciente y Auditoría',

      // Alerts & Notes
      'alert.central_subscription_notice': 'Aviso de Suscripción Central:',
      'alert.offline_notice': 'Estás sin conexión. Mostrando datos en caché.',
      'alert.admin_only_notice': 'Las capacidades están gobernadas por licencias Central.',

      // Badges
      'badge.live': 'EN VIVO',
      'badge.soon': 'PRONTO',
      'badge.new': 'NUEVO',
      'badge.hot': 'DESTACADO',
      'badge.active': 'Activo',
      'badge.setup': 'Config',
      'badge.licenses': 'LICENCIAS'
    },

    de: {
      // Shell & Mode Navigation
      'shell.console': 'Konsole',
      'shell.workspace': 'Arbeitsbereich',
      'shell.admin_console': 'Verwaltungskonsole',
      'shell.users_workspace': 'Benutzer-Arbeitsbereich',
      'shell.switch_to_workspace': 'Zum Benutzer-Arbeitsbereich wechseln',
      'shell.switch_to_console': 'Zur Verwaltungskonsole wechseln',
      'shell.search_placeholder': 'Arbeitsbereich durchsuchen...',
      'shell.help_support': 'Hilfe & Support',
      'shell.sign_out': 'Abmelden',
      'shell.powered_by': 'Bereitgestellt von Ozikol',
      'shell.workspace_vault': 'Tresor des Arbeitsbereichs',
      'shell.pin_nav': 'Angeheftete Navigation',

      // Navigation Groups & Items
      'nav.website': 'Webseite',
      'nav.home': 'Startseite',
      'nav.link_domain': 'Domain Verknüpfen',
      'nav.manage_domain': 'Domain Verwalten',
      'nav.command_center': 'Kommandozentrale',
      'nav.console_dashboard': 'Konsolen-Dashboard',
      'nav.workspace_home': 'Arbeitsbereich-Startseite',
      'nav.feature_billing': 'Funktionsabrechnung',
      'nav.security_audit': 'Sicherheitsaudit',
      'nav.cms_studio': 'CMS-Studio',
      'nav.cms_dashboard': 'CMS-Dashboard',
      'nav.web_categories': 'Web-Kategorien',
      'nav.all_web_pages': 'Alle Webseiten',
      'nav.blog_articles': 'Blog-Artikel',
      'nav.blog_categories': 'Blog-Kategorien',
      'nav.manage_forms': 'Formulare Verwalten',
      'nav.my_templates': 'Meine Vorlagen',
      'nav.ui_marketplace': 'UI-Marktplatz',
      'nav.brand_settings': 'Marke & Einstellungen',
      'nav.custom_domain': 'Eigene Domain',
      'nav.commerce_studio': 'Handelsstudio',
      'nav.products_catalog': 'Produktkatalog',
      'nav.create_product': 'Produkt Erstellen',
      'nav.user_management': 'Benutzerverwaltung',
      'nav.user_directory': 'Benutzerverzeichnis',
      'nav.all_members': 'Alle Mitglieder',
      'nav.registration_form_builder': 'Registrierungsformular-Builder',
      'nav.kpis_leaderboard': 'KPIs & Rangliste',
      'nav.activity_audit_logs': 'Aktivitätsprotokolle',
      'nav.notification_studio': 'Benachrichtigungsstudio',
      'nav.people_community': 'Mitglieder & Gemeinschaft',
      'nav.chat_messenger': 'Ozikol Chat Messenger',
      'nav.calendar_followups': 'Kalender & Nachverfolgungen',
      'nav.gocall_dispatch': 'GoCall KI-Sprachverteiler',
      'nav.my_profile': 'Mein Profil',
      'nav.my_cv_biography': 'Mein Lebenslauf & Biografie',
      'nav.my_kpis': 'Meine KPIs & Leistung',
      'nav.my_purchases': 'Meine Einkäufe',
      'nav.security_password': 'Sicherheit & Passwort',
      'nav.notifications_alerts': 'Benachrichtigungen & Warnungen',
      'nav.groups_directory': 'Gruppenverzeichnis',
      'nav.alumni_network': 'Alumni-Netzwerk',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Telemetrie Aktualisieren',
      'btn.new_web_page': 'Neue Webseite',
      'btn.create_dynamic_page': 'Dynamische Webseite Erstellen',
      'btn.register_new_member': 'Neues Mitglied Registrieren',
      'btn.create_group_channel': 'Gruppenkanal Erstellen',
      'btn.brand_customizer': 'Marken- & Design-Anpassung',
      'btn.telemetry_log': 'Telemetrieprotokoll',
      'btn.view_directory': 'Verzeichnis Anzeigen →',
      'btn.save_changes': 'Änderungen Speichern',
      'btn.cancel': 'Abbrechen',
      'btn.continue': 'Weiter',
      'btn.close': 'Schließen',
      'btn.review_entitlements': 'Berechtigungen Prüfen',
      'btn.manage_subscriptions': 'Abonnements Verwalten',
      'btn.retry': 'Wiederholen',

      // Health Counters & KPIs
      'kpi.core_performance': 'Leistungs- & Systemstatus-Zähler',
      'kpi.all_services_operational': 'Alle Dienste Betriebsbereit',
      'kpi.total_members': 'MITGLIEDER GESAMT',
      'kpi.group_channels': 'GRUPPENKANÄLE',
      'kpi.published_pages': 'VERÖFFENTLICHTE SEITEN',
      'kpi.hero_sliders': 'HERO-BANNER',
      'kpi.active_faqs': 'AKTIVE FAQS',
      'kpi.platform_roles': 'PLATTFORM-ROLLEN',
      'kpi.recently_registered': 'Kürzlich Registrierte Mitglieder',
      'kpi.quick_actions': 'Schnellaktionen & Verknüpfungen',
      'kpi.recent_activity': 'Letzte Aktivitäten & Prüfpfad',

      // Alerts & Notes
      'alert.central_subscription_notice': 'Zentraler Abonnement-Hinweis:',
      'alert.offline_notice': 'Sie sind offline. Zwischengespeicherte Daten werden angezeigt.',
      'alert.admin_only_notice': 'Die Plattformfunktionen unterliegen den zentralen Lizenzen.',

      // Badges
      'badge.live': 'LIVE',
      'badge.soon': 'BALD',
      'badge.new': 'NEU',
      'badge.hot': 'TOP',
      'badge.active': 'Aktiv',
      'badge.setup': 'Setup',
      'badge.licenses': 'LIZENZEN'
    }
  };

  constructor() {}

  public get currentLanguage(): SupportedLanguage {
    return this.currentLangSubject.value;
  }

  public get currentLanguageOption(): LanguageOption {
    const code = this.currentLangSubject.value;
    return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
  }

  public get supportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }

  public setLanguage(lang: SupportedLanguage): void {
    if (this.currentLangSubject.value === lang) return;
    this.currentLangSubject.next(lang);
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {}
  }

  public translate(key: string, fallback?: string): string {
    const lang = this.currentLangSubject.value;
    const table = this.translations[lang] || this.translations['en'];
    if (table && table[key]) {
      return table[key];
    }
    // Fallback to English dictionary
    if (this.translations['en'] && this.translations['en'][key]) {
      return this.translations['en'][key];
    }
    return fallback ?? key;
  }

  private getInitialLanguage(): SupportedLanguage {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as SupportedLanguage;
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
      const navLang = navigator.language?.split('-')[0]?.toLowerCase() as SupportedLanguage;
      if (navLang && SUPPORTED_LANGUAGES.some(l => l.code === navLang)) {
        return navLang;
      }
    } catch {}
    return 'en';
  }
}
