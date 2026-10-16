/// <summary>
/// Domain model and translation dictionaries for multi-language localization
/// across Ozikol BCC (Business Command Center) Flutter Desktop and Mobile applications.
/// Provides 1-to-1 parity with the Ozikol Central multi-language suite.
/// </summary>
library;

/// <summary>
/// Represents a supported language in the Ozikol BCC translation suite.
/// </summary>
class AppLanguage {
  /// The ISO 639-1 language code (e.g. 'en', 'fr', 'es', 'de').
  final String code;

  /// English display name of the language (e.g. 'English', 'French').
  final String name;

  /// Native display name of the language (e.g. 'English', 'Français', 'Español', 'Deutsch').
  final String nativeName;

  /// Country flag emoji representing the primary locale region (e.g. '🇬🇧', '🇫🇷', '🇪🇸', '🇩🇪').
  final String flag;

  /// Short display label with flag and code matching Central's .oz-lang-switcher pill (e.g. '🇬🇧 EN').
  final String shortLabel;

  /// Creates a immutable [AppLanguage] descriptor.
  const AppLanguage({
    required this.code,
    required this.name,
    required this.nativeName,
    required this.flag,
    required this.shortLabel,
  });
}

/// <summary>
/// Static translation dictionary repository and lookup engine.
/// Replicates the Central and Angular Web client translation catalogs.
/// </summary>
class AppTranslations {
  /// Canonical list of supported languages matching Ozikol Central.
  static const List<AppLanguage> supportedLanguages = [
    AppLanguage(code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', shortLabel: '🇬🇧 EN'),
    AppLanguage(code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', shortLabel: '🇫🇷 FR'),
    AppLanguage(code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', shortLabel: '🇪🇸 ES'),
    AppLanguage(code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', shortLabel: '🇩🇪 DE'),
  ];

  /// Dictionary tables indexed by language code and translation token.
  static const Map<String, Map<String, String>> _translations = {
    'en': {
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
      'shell.select_language': 'Select Language',
      'shell.calendar_schedules': 'Calendar & Schedules',
      'shell.toggle_theme': 'Toggle Color Theme',
      'shell.notifications': 'Notifications',
      'shell.switch_workspace': 'Switch Workspace',
      'shell.refresh_workspace': 'Refresh Workspace & Telemetry',

      // Navigation Groups & Items
      'nav.website': 'Website',
      'nav.home': 'Home',
      'nav.command_center': 'Command Center',
      'nav.console_dashboard': 'Console Dashboard',
      'nav.workspace_home': 'Workspace Home',
      'nav.feature_billing': 'Feature Billing',
      'nav.security_audit': 'Security Audit',
      'nav.brand_settings': 'Brand & Settings',
      'nav.custom_domain': 'Custom Domain',
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
      'btn.register_new_member': 'Register New Member',
      'btn.create_group_channel': 'Create Group Channel',
      'btn.brand_customizer': 'Brand & Theme Customizer',
      'btn.telemetry_log': 'Telemetry Log',
      'btn.view_directory': 'View Directory →',
      'btn.save_changes': 'Save Changes',
      'btn.cancel': 'Cancel',
      'btn.continue': 'Continue',
      'btn.close': 'Close',

      // Central Billing & Expirations
      'billing.notice_title': 'Central Feature Subscription Notice:',
      'billing.review_entitlements': 'Review Entitlements',
      'billing.expired_feature': 'Your subscription for {feature} has expired.',
      'billing.expires_soon': 'Your subscription for {feature} will expire in {days} day(s).',

      // Health Counters & KPIs
      'kpi.core_performance': 'Core Performance & Health Counters',
      'kpi.all_operational': 'All Services Operational',
      'kpi.total_members': 'Total Enrolled Members',
      'kpi.active_subscribers': 'Active Subscribers',
      'kpi.mrr': 'Monthly Subscription Revenue',
      'kpi.live_forms': 'Live Intake Forms',
      'kpi.published_pages': 'Published Web Pages',
      'kpi.system_health': 'System Health Score',
      'kpi.recent_members': 'Recently Registered Members',
      'kpi.quick_actions': 'Quick Actions & Tools',
      'kpi.audit_trail': 'Security & Activity Audit Trail',

      // Status Badges
      'badge.superadmin': 'SuperAdmin',
      'badge.admin': 'Admin',
      'badge.member': 'Member',
      'badge.operational': 'Operational',
      'badge.live': 'LIVE',
      'badge.active': 'Active',
      'badge.online': 'Online',
      'badge.offline': 'Offline'
    },
    'fr': {
      // Shell & Mode Navigation
      'shell.console': 'Console',
      'shell.workspace': 'Espace',
      'shell.admin_console': "Console d'administration",
      'shell.users_workspace': 'Espace Utilisateurs',
      'shell.switch_to_workspace': "Passer à l'espace utilisateurs",
      'shell.switch_to_console': "Passer à la console d'administration",
      'shell.search_placeholder': "Rechercher dans l'espace...",
      'shell.help_support': 'Aide et support',
      'shell.sign_out': 'Déconnexion',
      'shell.powered_by': 'Propulsé par Ozikol',
      'shell.select_language': 'Sélectionner la langue',
      'shell.calendar_schedules': 'Calendrier & Horaires',
      'shell.toggle_theme': 'Changer le thème',
      'shell.notifications': 'Notifications',
      'shell.switch_workspace': "Changer d'espace",
      'shell.refresh_workspace': 'Actualiser télémétrie',

      // Navigation Groups & Items
      'nav.website': 'Site Web',
      'nav.home': 'Accueil',
      'nav.command_center': 'Centre de commande',
      'nav.console_dashboard': 'Tableau de bord Console',
      'nav.workspace_home': "Accueil de l'espace",
      'nav.feature_billing': 'Facturation des fonctionnalités',
      'nav.security_audit': 'Audit de sécurité',
      'nav.brand_settings': 'Marque & Paramètres',
      'nav.custom_domain': 'Domaine personnalisé',
      'nav.user_management': 'Gestion des utilisateurs',
      'nav.user_directory': 'Répertoire utilisateurs',
      'nav.all_members': 'Tous les membres',
      'nav.registration_form_builder': "Générateur d'inscriptions",
      'nav.kpis_leaderboard': 'KPIs & Classement',
      'nav.activity_audit_logs': "Journaux d'audit d'activité",
      'nav.notification_studio': 'Studio de notification',
      'nav.people_community': 'Membres & Communauté',
      'nav.chat_messenger': 'Messagerie Ozikol Chat',
      'nav.calendar_followups': 'Calendrier & Relances',
      'nav.gocall_dispatch': 'Dispatching IA GoCall',
      'nav.my_profile': 'Mon profil',
      'nav.my_cv_biography': 'Mon CV et Biographie',
      'nav.my_kpis': 'Mes KPIs & Performance',
      'nav.my_purchases': 'Mes achats',
      'nav.security_password': 'Sécurité & Mot de passe',
      'nav.notifications_alerts': 'Notifications & Alertes',
      'nav.groups_directory': 'Répertoire des groupes',
      'nav.alumni_network': 'Réseau des anciens',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Actualiser télémétrie',
      'btn.register_new_member': 'Inscrire un membre',
      'btn.create_group_channel': 'Créer un canal de groupe',
      'btn.brand_customizer': 'Personnalisateur de marque',
      'btn.telemetry_log': 'Journal de télémétrie',
      'btn.view_directory': 'Voir le répertoire →',
      'btn.save_changes': 'Enregistrer modifications',
      'btn.cancel': 'Annuler',
      'btn.continue': 'Continuer',
      'btn.close': 'Fermer',

      // Central Billing & Expirations
      'billing.notice_title': "Avis d'abonnement Central :",
      'billing.review_entitlements': 'Examiner les droits',
      'billing.expired_feature': 'Votre abonnement pour {feature} a expiré.',
      'billing.expires_soon': 'Votre abonnement pour {feature} expirera dans {days} jour(s).',

      // Health Counters & KPIs
      'kpi.core_performance': 'Performance et compteurs de santé',
      'kpi.all_operational': 'Tous les services opérationnels',
      'kpi.total_members': 'Membres inscrits au total',
      'kpi.active_subscribers': 'Abonnés actifs',
      'kpi.mrr': 'Revenu mensuel récurrent',
      'kpi.live_forms': 'Formulaires actifs',
      'kpi.published_pages': 'Pages web publiées',
      'kpi.system_health': 'Score de santé système',
      'kpi.recent_members': 'Membres récemment inscrits',
      'kpi.quick_actions': 'Actions et outils rapides',
      'kpi.audit_trail': "Piste d'audit et sécurité",

      // Status Badges
      'badge.superadmin': 'SuperAdmin',
      'badge.admin': 'Admin',
      'badge.member': 'Membre',
      'badge.operational': 'Opérationnel',
      'badge.live': 'EN LIGNE',
      'badge.active': 'Actif',
      'badge.online': 'En ligne',
      'badge.offline': 'Hors ligne'
    },
    'es': {
      // Shell & Mode Navigation
      'shell.console': 'Consola',
      'shell.workspace': 'Espacio',
      'shell.admin_console': 'Consola de Administración',
      'shell.users_workspace': 'Espacio de Usuarios',
      'shell.switch_to_workspace': 'Cambiar a Espacio de Usuarios',
      'shell.switch_to_console': 'Cambiar a Consola de Administración',
      'shell.search_placeholder': 'Buscar en el espacio...',
      'shell.help_support': 'Ayuda y Soporte',
      'shell.sign_out': 'Cerrar Sesión',
      'shell.powered_by': 'Desarrollado por Ozikol',
      'shell.select_language': 'Seleccionar idioma',
      'shell.calendar_schedules': 'Calendario y Horarios',
      'shell.toggle_theme': 'Cambiar tema de color',
      'shell.notifications': 'Notificaciones',
      'shell.switch_workspace': 'Cambiar Espacio',
      'shell.refresh_workspace': 'Actualizar telemetría',

      // Navigation Groups & Items
      'nav.website': 'Sitio Web',
      'nav.home': 'Inicio',
      'nav.command_center': 'Centro de Comando',
      'nav.console_dashboard': 'Panel de Consola',
      'nav.workspace_home': 'Inicio del Espacio',
      'nav.feature_billing': 'Facturación de Funciones',
      'nav.security_audit': 'Auditoría de Seguridad',
      'nav.brand_settings': 'Marca y Configuración',
      'nav.custom_domain': 'Dominio Personalizado',
      'nav.user_management': 'Gestión de Usuarios',
      'nav.user_directory': 'Directorio de Usuarios',
      'nav.all_members': 'Todos los Miembros',
      'nav.registration_form_builder': 'Constructor de Registro',
      'nav.kpis_leaderboard': 'KPIs y Clasificación',
      'nav.activity_audit_logs': 'Registros de Auditoría',
      'nav.notification_studio': 'Estudio de Notificaciones',
      'nav.people_community': 'Personas y Comunidad',
      'nav.chat_messenger': 'Mensajería Ozikol Chat',
      'nav.calendar_followups': 'Calendario y Seguimientos',
      'nav.gocall_dispatch': 'Despacho IA GoCall',
      'nav.my_profile': 'Mi Perfil',
      'nav.my_cv_biography': 'Mi CV y Biografía',
      'nav.my_kpis': 'Mis KPIs y Rendimiento',
      'nav.my_purchases': 'Mis Compras',
      'nav.security_password': 'Seguridad y Contraseña',
      'nav.notifications_alerts': 'Notificaciones y Alertas',
      'nav.groups_directory': 'Directorio de Grupos',
      'nav.alumni_network': 'Red de Exalumnos',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Actualizar Telemetría',
      'btn.register_new_member': 'Registrar Nuevo Miembro',
      'btn.create_group_channel': 'Crear Canal de Grupo',
      'btn.brand_customizer': 'Personalizador de Marca',
      'btn.telemetry_log': 'Registro de Telemetría',
      'btn.view_directory': 'Ver Directorio →',
      'btn.save_changes': 'Guardar Cambios',
      'btn.cancel': 'Cancelar',
      'btn.continue': 'Continuar',
      'btn.close': 'Cerrar',

      // Central Billing & Expirations
      'billing.notice_title': 'Aviso de Suscripción Central:',
      'billing.review_entitlements': 'Revisar Derechos',
      'billing.expired_feature': 'Su suscripción para {feature} ha caducado.',
      'billing.expires_soon': 'Su suscripción para {feature} vencerá en {days} día(s).',

      // Health Counters & KPIs
      'kpi.core_performance': 'Rendimiento y Contadores de Salud',
      'kpi.all_operational': 'Todos los Servicios Operativos',
      'kpi.total_members': 'Total de Miembros Inscritos',
      'kpi.active_subscribers': 'Suscriptores Activos',
      'kpi.mrr': 'Ingreso Mensual Recurrente',
      'kpi.live_forms': 'Formularios Activos',
      'kpi.published_pages': 'Páginas Web Publicadas',
      'kpi.system_health': 'Puntuación de Salud',
      'kpi.recent_members': 'Miembros Recientemente Registrados',
      'kpi.quick_actions': 'Acciones y Herramientas Rápidas',
      'kpi.audit_trail': 'Pista de Auditoría y Seguridad',

      // Status Badges
      'badge.superadmin': 'SuperAdmin',
      'badge.admin': 'Admin',
      'badge.member': 'Miembro',
      'badge.operational': 'Operativo',
      'badge.live': 'EN VIVO',
      'badge.active': 'Activo',
      'badge.online': 'En línea',
      'badge.offline': 'Desconectado'
    },
    'de': {
      // Shell & Mode Navigation
      'shell.console': 'Konsole',
      'shell.workspace': 'Arbeitsbereich',
      'shell.admin_console': 'Administrationskonsole',
      'shell.users_workspace': 'Benutzer-Arbeitsbereich',
      'shell.switch_to_workspace': 'Zum Benutzer-Arbeitsbereich wechseln',
      'shell.switch_to_console': 'Zur Administrationskonsole wechseln',
      'shell.search_placeholder': 'Arbeitsbereich durchsuchen...',
      'shell.help_support': 'Hilfe & Support',
      'shell.sign_out': 'Abmelden',
      'shell.powered_by': 'Bereitgestellt von Ozikol',
      'shell.select_language': 'Sprache auswählen',
      'shell.calendar_schedules': 'Kalender & Zeitpläne',
      'shell.toggle_theme': 'Farbdesign wechseln',
      'shell.notifications': 'Benachrichtigungen',
      'shell.switch_workspace': 'Arbeitsbereich wechseln',
      'shell.refresh_workspace': 'Telemetrie aktualisieren',

      // Navigation Groups & Items
      'nav.website': 'Webseite',
      'nav.home': 'Startseite',
      'nav.command_center': 'Kommandozentrale',
      'nav.console_dashboard': 'Konsolen-Dashboard',
      'nav.workspace_home': 'Arbeitsbereich-Startseite',
      'nav.feature_billing': 'Funktionsabrechnung',
      'nav.security_audit': 'Sicherheitsaudit',
      'nav.brand_settings': 'Marke & Einstellungen',
      'nav.custom_domain': 'Eigene Domain',
      'nav.user_management': 'Benutzerverwaltung',
      'nav.user_directory': 'Benutzerverzeichnis',
      'nav.all_members': 'Alle Mitglieder',
      'nav.registration_form_builder': 'Registrierungs-Generator',
      'nav.kpis_leaderboard': 'KPIs & Rangliste',
      'nav.activity_audit_logs': 'Aktivitäts-Audit-Protokolle',
      'nav.notification_studio': 'Benachrichtigungsstudio',
      'nav.people_community': 'Mitglieder & Community',
      'nav.chat_messenger': 'Ozikol Chat Messenger',
      'nav.calendar_followups': 'Kalender & Nachverfolgungen',
      'nav.gocall_dispatch': 'GoCall KI Dispatch',
      'nav.my_profile': 'Mein Profil',
      'nav.my_cv_biography': 'Mein Lebenslauf & Biografie',
      'nav.my_kpis': 'Meine KPIs & Leistung',
      'nav.my_purchases': 'Meine Einkäufe',
      'nav.security_password': 'Sicherheit & Passwort',
      'nav.notifications_alerts': 'Benachrichtigungen & Warnungen',
      'nav.groups_directory': 'Gruppenverzeichnis',
      'nav.alumni_network': 'Alumni-Netzwerk',

      // Actions & Buttons
      'btn.refresh_telemetry': 'Telemetrie aktualisieren',
      'btn.register_new_member': 'Neues Mitglied registrieren',
      'btn.create_group_channel': 'Gruppenkanal erstellen',
      'btn.brand_customizer': 'Marken- und Design-Editor',
      'btn.telemetry_log': 'Telemetrie-Protokoll',
      'btn.view_directory': 'Verzeichnis ansehen →',
      'btn.save_changes': 'Änderungen speichern',
      'btn.cancel': 'Abbrechen',
      'btn.continue': 'Weiter',
      'btn.close': 'Schließen',

      // Central Billing & Expirations
      'billing.notice_title': 'Hinweis zum Central-Abonnement:',
      'billing.review_entitlements': 'Berechtigungen prüfen',
      'billing.expired_feature': 'Ihr Abonnement für {feature} ist abgelaufen.',
      'billing.expires_soon': 'Ihr Abonnement für {feature} läuft in {days} Tag(en) ab.',

      // Health Counters & KPIs
      'kpi.core_performance': 'Leistungs- und Systemzähler',
      'kpi.all_operational': 'Alle Systeme betriebsbereit',
      'kpi.total_members': 'Gesamt registrierte Mitglieder',
      'kpi.active_subscribers': 'Aktive Abonnenten',
      'kpi.mrr': 'Monatlicher wiederkehrender Umsatz',
      'kpi.live_forms': 'Aktive Formulare',
      'kpi.published_pages': 'Veröffentlichte Webseiten',
      'kpi.system_health': 'System-Integritätswert',
      'kpi.recent_members': 'Kürzlich registrierte Mitglieder',
      'kpi.quick_actions': 'Schnellaktionen & Werkzeuge',
      'kpi.audit_trail': 'Sicherheits- & Aktivitätsprotokoll',

      // Status Badges
      'badge.superadmin': 'SuperAdmin',
      'badge.admin': 'Admin',
      'badge.member': 'Mitglied',
      'badge.operational': 'Betriebsbereit',
      'badge.live': 'LIVE',
      'badge.active': 'Aktiv',
      'badge.online': 'Online',
      'badge.offline': 'Offline'
    }
  };

  /// <summary>
  /// Resolves the localized string for a token in the target language.
  /// Falls back to English, and ultimately to the provided [fallback] or raw [token].
  /// </summary>
  /// <param name="token">The dot-notated translation token key.</param>
  /// <param name="languageCode">The two-letter target language code ('en', 'fr', 'es', 'de').</param>
  /// <param name="fallback">Optional fallback string if token is not found.</param>
  /// <returns>The localized text.</returns>
  static String get(String token, String languageCode, {String? fallback}) {
    final langTable = _translations[languageCode] ?? _translations['en']!;
    if (langTable.containsKey(token)) {
      return langTable[token]!;
    }
    // Fallback to English dictionary
    final enTable = _translations['en']!;
    if (enTable.containsKey(token)) {
      return enTable[token]!;
    }
    return fallback ?? token;
  }

  /// <summary>
  /// Resolves the [AppLanguage] descriptor for a language code.
  /// </summary>
  /// <param name="code">The language code to look up.</param>
  /// <returns>Matching [AppLanguage] or English as default.</returns>
  static AppLanguage getLanguage(String code) {
    return supportedLanguages.firstWhere(
      (l) => l.code == code,
      orElse: () => supportedLanguages.first,
    );
  }
}
