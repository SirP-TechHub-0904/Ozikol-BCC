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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Executive Command & Governance',
      'suite.content_cms': 'Content CMS Studio',
      'suite.people_community': 'People, Community & Collaboration',
      'suite.workforce_shifts': 'Workforce, Shifts & Scheduling',
      'suite.reports_forms': 'Data Collection, Reports & Forms',
      'suite.events_training': 'Events, Ticketing & Training',
      'suite.finance_revenue': 'Finance, Contributions & Revenue',
      'suite.operations_logistics': 'Operations, Logistics & Facilities',
      'suite.communication_ai': 'Communication, AI & Support',
      'suite.compliance_governance': 'Governance, Compliance & Safeguarding',
      'suite.demographics_census': 'Demographics, Census & Analytics',
      'suite.member_workspace': 'Personal Workspace Hub',

      // Additional Suite Navigation Items
      'nav.identity_control': 'Identity & Access Control',
      'nav.roles_permissions': 'Roles & Permissions',
      'nav.user_invitations': 'Member Invitations',
      'nav.global_policies': 'Global Security Policies',
      'nav.whistleblowing': 'Whistleblowing & Feedback',
      'nav.staff_rota': 'Staff & Volunteer Rota',
      'nav.shift_swaps': 'Shift Swaps & Leave',
      'nav.attendance_tracking': 'Attendance & Clock-In',
      'nav.dynamic_reports': 'Dynamic Reports',
      'nav.forms_surveys': 'Forms & Surveys',
      'nav.reference_forms': 'Reference Form System',
      'nav.knowledge_base': 'Knowledge Base',
      'nav.event_ticketing': 'Event Ticketing & Passes',
      'nav.speaker_sessions': 'Speaker & Session Tracks',
      'nav.attendee_management': 'Attendee Management',
      'nav.invoicing_dues': 'Invoicing & Member Dues',
      'nav.embedded_banking': 'Embedded Banking & Rails',
      'nav.grant_ledger': 'Proposal & Grant Ledger',
      'nav.elections_voting': 'Elections & E-Voting',
      'nav.facilities_equipment': 'Facilities & Equipment Checkout',
      'nav.helpdesk_support': 'Helpdesk & Support Desk',
      'nav.document_vault': 'Document Vault & Archive',
      'nav.lms_training': 'Learning Management (LMS)',
      'nav.certificate_verification': 'Certificate Verification',
      'nav.kyc_verification': 'KYC Verification',
      'nav.community_census': 'Community Census & Mapping',
      'nav.field_surveyor': 'Field Surveyor Tools',
      'nav.digital_id_cards': 'Digital Member ID Cards',
      'nav.linked_devices': 'Linked Devices & Sessions',

      // RBAC Privileges
      'rbac.view_privileges': 'View Privileges',
      'rbac.privileges_modal_title': 'Account Roles & Security Privileges',
      'rbac.assigned_roles': 'Assigned Platform Roles',
      'rbac.unlocked_capabilities': 'Granted System Capabilities',
      'rbac.accessible_pages': 'Unlocked Suites & Modules',
      'rbac.platform_access': 'Cross-Platform Parity',
      'rbac.emergency_2fa': 'Emergency 2FA Override',
      'rbac.user_forensics': 'User Activity Audit Logs',
      'rbac.remote_revocation': 'Remote Session Eviction',
      'rbac.role_superadmin': 'SuperAdmin',
      'rbac.role_admin': 'Administrator',
      'rbac.role_member': 'Member',

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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Commandement & Gouvernance',
      'suite.content_cms': 'Studio CMS de Contenu',
      'suite.people_community': 'Personnes, Communauté et Collaboration',
      'suite.workforce_shifts': 'Effectifs, Équipes et Horaires',
      'suite.reports_forms': 'Collecte de Données, Rapports et Formulaires',
      'suite.events_training': 'Événements, Billetterie et Formation',
      'suite.finance_revenue': 'Finances, Contributions et Revenus',
      'suite.operations_logistics': 'Opérations, Logistique et Installations',
      'suite.communication_ai': 'Communication, IA et Support',
      'suite.compliance_governance': 'Gouvernance, Conformité et Protection',
      'suite.demographics_census': 'Démographie, Recensement et Analyses',
      'suite.member_workspace': 'Espace Personnel',

      // Additional Suite Navigation Items
      'nav.identity_control': 'Contrôle d’Identité & Accès',
      'nav.roles_permissions': 'Rôles & Permissions',
      'nav.user_invitations': 'Invitations de Membres',
      'nav.global_policies': 'Politiques de Sécurité Globales',
      'nav.whistleblowing': 'Signalement & Retours',
      'nav.staff_rota': 'Planning du Personnel & Bénévoles',
      'nav.shift_swaps': 'Échanges de Quarts & Congés',
      'nav.attendance_tracking': 'Pointage & Présence',
      'nav.dynamic_reports': 'Rapports Dynamiques',
      'nav.forms_surveys': 'Formulaires & Sondages',
      'nav.reference_forms': 'Système de Formulaires de Référence',
      'nav.knowledge_base': 'Base de Connaissances',
      'nav.event_ticketing': 'Billetterie & Pass d’Événements',
      'nav.speaker_sessions': 'Intervenants & Sessions',
      'nav.attendee_management': 'Gestion des Participants',
      'nav.invoicing_dues': 'Facturation & Cotisations',
      'nav.embedded_banking': 'Services Bancaires Intégrés',
      'nav.grant_ledger': 'Grand Livre des Subventions',
      'nav.elections_voting': 'Élections & Vote Électronique',
      'nav.facilities_equipment': 'Équipements & Installations',
      'nav.helpdesk_support': 'Centre d’Assistance & Support',
      'nav.document_vault': 'Coffre-fort Documentaire',
      'nav.lms_training': 'Gestion de l’Apprentissage (LMS)',
      'nav.certificate_verification': 'Vérification de Certificats',
      'nav.kyc_verification': 'Vérification KYC',
      'nav.community_census': 'Recensement & Cartographie',
      'nav.field_surveyor': 'Outils d’Enquête de Terrain',
      'nav.digital_id_cards': 'Cartes d’Identité Numériques',
      'nav.linked_devices': 'Appareils Connectés & Sessions',

      // RBAC Privileges
      'rbac.view_privileges': 'Voir les Privilèges',
      'rbac.privileges_modal_title': 'Rôles & Privilèges du Compte',
      'rbac.assigned_roles': 'Rôles de Plateforme Assignés',
      'rbac.unlocked_capabilities': 'Capacités Système Accordées',
      'rbac.accessible_pages': 'Suites & Modules Débloqués',
      'rbac.platform_access': 'Parité Multiplateforme',
      'rbac.emergency_2fa': 'Dérogation d’Urgence 2FA',
      'rbac.user_forensics': 'Journaux d’Activité Utilisateur',
      'rbac.remote_revocation': 'Éviction de Session à Distance',
      'rbac.role_superadmin': 'SuperAdmin',
      'rbac.role_admin': 'Administrateur',
      'rbac.role_member': 'Membre',

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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Mando Ejecutivo y Gobernanza',
      'suite.content_cms': 'Estudio CMS de Contenido',
      'suite.people_community': 'Personas, Comunidad y Colaboración',
      'suite.workforce_shifts': 'Personal, Turnos y Horarios',
      'suite.reports_forms': 'Recopilación de Datos, Informes y Formularios',
      'suite.events_training': 'Eventos, Entradas y Formación',
      'suite.finance_revenue': 'Finanzas, Contribuciones e Ingresos',
      'suite.operations_logistics': 'Operaciones, Logística e Instalaciones',
      'suite.communication_ai': 'Comunicación, IA y Soporte',
      'suite.compliance_governance': 'Gobernanza, Cumplimiento y Protección',
      'suite.demographics_census': 'Demografía, Censo y Análisis',
      'suite.member_workspace': 'Espacio Personal',

      // Additional Suite Navigation Items
      'nav.identity_control': 'Control de Identidad y Acceso',
      'nav.roles_permissions': 'Roles y Permisos',
      'nav.user_invitations': 'Invitaciones de Miembros',
      'nav.global_policies': 'Políticas Globales de Seguridad',
      'nav.whistleblowing': 'Canal de Denuncias y Comentarios',
      'nav.staff_rota': 'Turnos de Personal y Voluntarios',
      'nav.shift_swaps': 'Intercambio de Turnos y Permisos',
      'nav.attendance_tracking': 'Control de Asistencia y Fichaje',
      'nav.dynamic_reports': 'Informes Dinámicos',
      'nav.forms_surveys': 'Formularios y Encuestas',
      'nav.reference_forms': 'Sistema de Referencias',
      'nav.knowledge_base': 'Base de Conocimientos',
      'nav.event_ticketing': 'Venta de Entradas y Pases',
      'nav.speaker_sessions': 'Ponentes y Sesiones',
      'nav.attendee_management': 'Gestión de Asistentes',
      'nav.invoicing_dues': 'Facturación y Cuotas',
      'nav.embedded_banking': 'Servicios Bancarios Integrados',
      'nav.grant_ledger': 'Libro de Subvenciones',
      'nav.elections_voting': 'Elecciones y Votación Digital',
      'nav.facilities_equipment': 'Instalaciones y Equipos',
      'nav.helpdesk_support': 'Mesa de Ayuda y Soporte',
      'nav.document_vault': 'Bóveda de Documentos',
      'nav.lms_training': 'Gestión del Aprendizaje (LMS)',
      'nav.certificate_verification': 'Verificación de Certificados',
      'nav.kyc_verification': 'Verificación KYC',
      'nav.community_census': 'Censo Comunitario y Mapas',
      'nav.field_surveyor': 'Herramientas de Topografía',
      'nav.digital_id_cards': 'Tarjetas de Identidad Digitales',
      'nav.linked_devices': 'Dispositivos Vinculados y Sesiones',

      // RBAC Privileges
      'rbac.view_privileges': 'Ver Privilegios',
      'rbac.privileges_modal_title': 'Roles y Privilegios de Seguridad',
      'rbac.assigned_roles': 'Roles Asignados en la Plataforma',
      'rbac.unlocked_capabilities': 'Capacidades del Sistema Otorgadas',
      'rbac.accessible_pages': 'Suites y Módulos Desbloqueados',
      'rbac.platform_access': 'Paridad Multiplataforma',
      'rbac.emergency_2fa': 'Anulación de Emergencia 2FA',
      'rbac.user_forensics': 'Registros de Auditoría de Usuario',
      'rbac.remote_revocation': 'Cierre Remoto de Sesiones',
      'rbac.role_superadmin': 'SuperAdmin',
      'rbac.role_admin': 'Administrador',
      'rbac.role_member': 'Miembro',

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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Führung & Governance',
      'suite.content_cms': 'Content CMS-Studio',
      'suite.people_community': 'Personen, Gemeinschaft & Zusammenarbeit',
      'suite.workforce_shifts': 'Mitarbeiter, Schichten & Planung',
      'suite.reports_forms': 'Datenerfassung, Berichte & Formulare',
      'suite.events_training': 'Veranstaltungen, Ticketing & Schulung',
      'suite.finance_revenue': 'Finanzen, Beiträge & Einnahmen',
      'suite.operations_logistics': 'Betrieb, Logistik & Einrichtungen',
      'suite.communication_ai': 'Kommunikation, KI & Support',
      'suite.compliance_governance': 'Governance, Compliance & Schutz',
      'suite.demographics_census': 'Demografie, Zensus & Analysen',
      'suite.member_workspace': 'Persönlicher Arbeitsbereich',

      // Additional Suite Navigation Items
      'nav.identity_control': 'Identitäts- & Zugriffskontrolle',
      'nav.roles_permissions': 'Rollen & Berechtigungen',
      'nav.user_invitations': 'Mitgliedereinladungen',
      'nav.global_policies': 'Globale Sicherheitsrichtlinien',
      'nav.whistleblowing': 'Hinweisgebersystem & Feedback',
      'nav.staff_rota': 'Dienstplan & Freiwillige',
      'nav.shift_swaps': 'Schichttausch & Abwesenheit',
      'nav.attendance_tracking': 'Zeiterfassung & Anwesenheit',
      'nav.dynamic_reports': 'Dynamische Berichte',
      'nav.forms_surveys': 'Formulare & Umfragen',
      'nav.reference_forms': 'Referenzformular-System',
      'nav.knowledge_base': 'Wissensdatenbank',
      'nav.event_ticketing': 'Ticketverkauf & Pässe',
      'nav.speaker_sessions': 'Referenten & Sitzungen',
      'nav.attendee_management': 'Teilnehmerverwaltung',
      'nav.invoicing_dues': 'Rechnungsstellung & Beiträge',
      'nav.embedded_banking': 'Integrierte Bankdienstleistungen',
      'nav.grant_ledger': 'Förderungs- & Zuschussbuch',
      'nav.elections_voting': 'Wahlen & Online-Abstimmung',
      'nav.facilities_equipment': 'Einrichtungen & Geräteausleihe',
      'nav.helpdesk_support': 'Helpdesk & Kundensupport',
      'nav.document_vault': 'Dokumententresor & Archiv',
      'nav.lms_training': 'Lernmanagementsystem (LMS)',
      'nav.certificate_verification': 'Zertifikatsüberprüfung',
      'nav.kyc_verification': 'KYC-Überprüfung',
      'nav.community_census': 'Gemeindezensus & Kartierung',
      'nav.field_surveyor': 'Feldforschungswerkzeuge',
      'nav.digital_id_cards': 'Digitale Mitgliedsausweise',
      'nav.linked_devices': 'Verknüpfte Geräte & Sitzungen',

      // RBAC Privileges
      'rbac.view_privileges': 'Berechtigungen Anzeigen',
      'rbac.privileges_modal_title': 'Kontorollen & Sicherheitsberechtigungen',
      'rbac.assigned_roles': 'Zugewiesene Plattform-Rollen',
      'rbac.unlocked_capabilities': 'Gewährte Systemfähigkeiten',
      'rbac.accessible_pages': 'Freigeschaltete Suites & Module',
      'rbac.platform_access': 'Plattformübergreifende Parität',
      'rbac.emergency_2fa': 'Notfall-2FA-Aufhebung',
      'rbac.user_forensics': 'Benutzeraktivitäts-Prüfprotokolle',
      'rbac.remote_revocation': 'Remotesitzungs-Abmeldung',
      'rbac.role_superadmin': 'SuperAdmin',
      'rbac.role_admin': 'Administrator',
      'rbac.role_member': 'Mitglied',

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
