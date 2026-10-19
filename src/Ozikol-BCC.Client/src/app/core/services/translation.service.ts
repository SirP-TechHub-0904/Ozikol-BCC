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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Executive Command',
      'suite.website_cms': 'Website & CMS',
      'suite.content_cms': 'Website & CMS',
      'suite.people_community': 'People & Community',
      'suite.daily_operations': 'Daily Operations',
      'suite.workforce_shifts': 'Daily Operations',
      'suite.commerce_store': 'Commerce & Store',
      'suite.finance_banking': 'Finance & Banking',
      'suite.finance_revenue': 'Finance & Banking',
      'suite.communication_support': 'Communication & Support',
      'suite.communication_ai': 'Communication & Support',
      'suite.reports_forms': 'Intelligence & Forms',
      'suite.events_training': 'Daily Operations',
      'suite.operations_logistics': 'Commerce & Store',
      'suite.academy_training': 'Academy & Training',
      'suite.compliance_governance': 'Compliance & Governance',
      'suite.demographics_census': 'Census & Demographics',
      'suite.billing_subscriptions': 'Billing & Subscriptions',
      'suite.security_audit': 'Security & Audit',
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
      'nav.dynamic_reports': 'Dynamic & Interval Reports',
      'nav.forms_surveys': 'Forms & Surveys Analytics',
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
      'badge.licenses': 'LICENSES',

      // Notifications & Empty States
      'notif.title': 'Notifications',
      'notif.empty_title': 'All caught up!',
      'notif.empty_desc': 'New alerts, updates, and maintenance advisories will appear right here in real time.',
      'notif.no_filter_title': 'No notifications in this filter',
      'notif.mark_all_read': 'Mark all as read',
      'notif.clear_all': 'Clear all',
      'notif.all': 'All',
      'notif.unread': 'Unread',
      'notif.view_action': 'View Action',
      'kpi.no_members': 'No registered members yet.',
      'kpi.no_audits': 'No audit actions logged yet.'
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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Commandement Exécutif',
      'suite.website_cms': 'Site Web & CMS',
      'suite.content_cms': 'Site Web & CMS',
      'suite.people_community': 'Personnes & Communauté',
      'suite.daily_operations': 'Opérations Quotidiennes',
      'suite.workforce_shifts': 'Opérations Quotidiennes',
      'suite.commerce_store': 'Commerce & Boutique',
      'suite.finance_banking': 'Finances & Banque',
      'suite.finance_revenue': 'Finances & Banque',
      'suite.communication_support': 'Communication & Support',
      'suite.communication_ai': 'Communication & Support',
      'suite.reports_forms': 'Renseignements & Formulaires',
      'suite.events_training': 'Opérations Quotidiennes',
      'suite.operations_logistics': 'Commerce & Boutique',
      'suite.academy_training': 'Académie & Formation',
      'suite.compliance_governance': 'Conformité & Gouvernance',
      'suite.demographics_census': 'Recensement & Démographie',
      'suite.billing_subscriptions': 'Facturation & Abonnements',
      'suite.security_audit': 'Sécurité & Audit',
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
      'badge.licenses': 'LICENCES',

      // Notifications & Empty States
      'notif.title': 'Notifications',
      'notif.empty_title': 'Tout est à jour !',
      'notif.empty_desc': 'Les nouvelles alertes, mises à jour et avis de maintenance apparaîtront ici en temps réel.',
      'notif.no_filter_title': 'Aucune notification dans ce filtre',
      'notif.mark_all_read': 'Tout marquer comme lu',
      'notif.clear_all': 'Tout effacer',
      'notif.all': 'Toutes',
      'notif.unread': 'Non lues',
      'notif.view_action': "Voir l'action",
      'kpi.no_members': 'Aucun membre enregistré pour le moment.',
      'kpi.no_audits': 'Aucune action de sécurité enregistrée.'
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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Mando Ejecutivo',
      'suite.website_cms': 'Sitio Web y CMS',
      'suite.content_cms': 'Sitio Web y CMS',
      'suite.people_community': 'Personas y Comunidad',
      'suite.daily_operations': 'Operaciones Diarias',
      'suite.workforce_shifts': 'Operaciones Diarias',
      'suite.commerce_store': 'Comercio y Tienda',
      'suite.finance_banking': 'Finanzas y Banca',
      'suite.finance_revenue': 'Finanzas y Banca',
      'suite.communication_support': 'Comunicación y Soporte',
      'suite.communication_ai': 'Comunicación y Soporte',
      'suite.reports_forms': 'Inteligencia y Formularios',
      'suite.events_training': 'Operaciones Diarias',
      'suite.operations_logistics': 'Comercio y Tienda',
      'suite.academy_training': 'Academia y Formación',
      'suite.compliance_governance': 'Cumplimiento y Gobernanza',
      'suite.demographics_census': 'Censo y Demografía',
      'suite.billing_subscriptions': 'Facturación y Suscripciones',
      'suite.security_audit': 'Seguridad y Auditoría',
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
      'badge.licenses': 'LICENCIAS',

      // Notifications & Empty States
      'notif.title': 'Notificaciones',
      'notif.empty_title': '¡Todo al día!',
      'notif.empty_desc': 'Las nuevas alertas, actualizaciones y avisos de mantenimiento aparecerán aquí en tiempo real.',
      'notif.no_filter_title': 'Sin notificaciones en este filtro',
      'notif.mark_all_read': 'Marcar todo como leído',
      'notif.clear_all': 'Borrar todo',
      'notif.all': 'Todas',
      'notif.unread': 'No leídas',
      'notif.view_action': 'Ver acción',
      'kpi.no_members': 'Aún no hay miembros registrados.',
      'kpi.no_audits': 'No hay acciones de auditoría registradas.'
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

      // Suite Headers (Ozikol Enterprise Suites)
      'suite.core_command': 'Führungskommando',
      'suite.website_cms': 'Website & CMS',
      'suite.content_cms': 'Website & CMS',
      'suite.people_community': 'Personen & Gemeinschaft',
      'suite.daily_operations': 'Tagesbetrieb & Schichten',
      'suite.workforce_shifts': 'Tagesbetrieb & Schichten',
      'suite.commerce_store': 'Handel & Shop',
      'suite.finance_banking': 'Finanzen & Banking',
      'suite.finance_revenue': 'Finanzen & Banking',
      'suite.communication_support': 'Kommunikation & Support',
      'suite.communication_ai': 'Kommunikation & Support',
      'suite.reports_forms': 'Intelligence & Formulare',
      'suite.events_training': 'Tagesbetrieb & Schichten',
      'suite.operations_logistics': 'Handel & Shop',
      'suite.academy_training': 'Akademie & Schulung',
      'suite.compliance_governance': 'Compliance & Governance',
      'suite.demographics_census': 'Zensus & Demografie',
      'suite.billing_subscriptions': 'Abrechnung & Abonnements',
      'suite.security_audit': 'Sicherheit & Audit',
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
      'badge.licenses': 'LIZENZEN',

      // Notifications & Empty States
      'notif.title': 'Benachrichtigungen',
      'notif.empty_title': 'Alles erledigt!',
      'notif.empty_desc': 'Neue Benachrichtigungen, Updates und Wartungshinweise erscheinen hier in Echtzeit.',
      'notif.no_filter_title': 'Keine Benachrichtigungen in diesem Filter',
      'notif.mark_all_read': 'Alle als gelesen markieren',
      'notif.clear_all': 'Alle löschen',
      'notif.all': 'Alle',
      'notif.unread': 'Ungelesen',
      'notif.view_action': 'Aktion anzeigen',
      'kpi.no_members': 'Noch keine registrierten Mitglieder.',
      'kpi.no_audits': 'Noch keine Audit-Aktivitäten protokolliert.'
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
