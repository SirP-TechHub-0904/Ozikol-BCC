"""
Script to inject French, Spanish, and German translations into MasterCatalogDataSeeder.cs
"""
import os

seeder_path = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.MasterPersistence.EF.MasterSQL\Seeding\MasterCatalogDataSeeder.cs"

with open(seeder_path, "r", encoding="utf-8") as f:
    code = f.read()

# Locate the end of the defaultDocuments array before closing brace
target_end = '                    """\n                }\n            };'
if target_end not in code:
    # Try alternate line endings
    target_end = '                    """\r\n                }\r\n            };'
    if target_end not in code:
        raise Exception("Could not find insertion point in defaultDocuments")

replacement = '''                    """
                },
                // ==========================================
                // FRENCH (FR) LEGAL DOCUMENTS
                // ==========================================
                new MasterLegalDocument
                {
                    Slug = "privacy-notice",
                    Title = "Notice de Confidentialité et Charte de Souveraineté des Données",
                    Category = "Confidentialité & Protection des Données",
                    Summary = "Transparence juridique détaillée sur la façon dont Ozikol isole, traite, protège et respecte les données institutionnelles sur nos 9 suites, portails web, MIS exécutif, applications mobiles et clients de bureau.",
                    Version = "2026.3",
                    EffectiveDate = new DateTime(2026, 4, 17, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "fr",
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Portée Exécutive et Contexte Architectural</h3>
                        <p>Chez Ozikol (« Ozikol », « Plateforme », « nous » ou « notre »), la protection de la souveraineté, de la vie privée et de l'intégrité des données de nos organisations clientes est fondamentale. Cette Notice de Confidentialité s'applique à tous les visiteurs, institutions abonnées, administrateurs, employés, résidents et utilisateurs finaux interagissant avec notre écosystème à travers nos canaux : portails web centraux, espaces de travail dédiés, consoles exécutives MIS, applications mobiles iOS/Android et applications de bureau Windows Enterprise.</p>

                        <div class="oz-legal-callout oz-legal-callout--info">
                            <p><strong>Principe Fondamental :</strong> Ozikol applique une stricte politique de confidentialité dès la conception. Nous ne vendons pas vos données, nous ne monétisons pas l'activité des utilisateurs, nous ne diffusons aucune publicité comportementale tierce et nous n'entraînons jamais de modèles publics d'intelligence artificielle sur vos registres privés.</p>
                        </div>

                        <h3>2. Rôles : Responsable du Traitement vs. Sous-Traitant</h3>
                        <ul>
                            <li><strong>Ozikol en tant que Sous-Traitant (Sous-traitant au sens du RGPD) :</strong> Lorsque les organisations clientes déploient Ozikol pour gérer leurs registres de membres, cotisations, sécurité des accès et personnel, l'organisation cliente agit en tant que <strong>Responsable du Traitement</strong>. Ozikol traite ces données strictement sur instruction documentée de l'organisation.</li>
                            <li><strong>Ozikol en tant que Responsable du Traitement :</strong> Ozikol agit en tant que Responsable du Traitement uniquement pour la gestion directe des comptes clients, la facturation des contrats d'entreprise et les demandes d'assistance centrale.</li>
                        </ul>

                        <h3>3. Catégories de Données Traitées par Suite Opérationnelle</h3>
                        <p>Ozikol organise ses capacités en 9 suites modulaires :</p>
                        <ul>
                            <li><strong>Comptabilité Financière &amp; Cotisations :</strong> Grands livres, échéanciers de cotisations, facturation des services et règlements. <em>Conformité PCI-DSS :</em> Traitement par jetons sécurisés sans stockage de numéros de carte (PAN) bruts.</li>
                            <li><strong>Gestion Immobilière, Actifs &amp; Installations :</strong> Registres des unités, baux commerciaux, maintenance préventive et relevés de compteurs (électricité, eau).</li>
                            <li><strong>Engagement Communautaire &amp; Réseau Social :</strong> Profils des membres, annuaires avec contrôles granulaires de visibilité et messagerie.</li>
                            <li><strong>Contrôle d'Accès &amp; Pass Numériques :</strong> QR codes d'invités, reconnaissance de plaques (LAPI/ANPR) et journaux d'horodatage aux barrières et tourniquets.</li>
                            <li><strong>Gouvernance, Élections Secrètes &amp; Scrutin Numérique :</strong> Registre électoral vérifié et bulletins chiffrés de manière homomorphe, dissociés de façon irréversible de l'identité des électeurs pour garantir le secret absolu du vote.</li>
                            <li><strong>Marchés Publics &amp; Fournisseurs :</strong> Appels d'offres (RFP), dossiers de conformité fournisseurs et bons de commande.</li>
                            <li><strong>Gestion des Incidents &amp; Diffusions SOS :</strong> Coordonnées GPS de détresse en temps réel, rondes des gardes et registres de rassemblement d'urgence.</li>
                            <li><strong>Événements &amp; Réservations de Salles :</strong> Réservations de salles, billetterie multi-niveaux et enregistrement par scan QR.</li>
                            <li><strong>Personnel, Sécurité &amp; Paie :</strong> Plannings de rotation, feuilles de temps et modèles biométriques hachés stockés localement sur le matériel sans téléversement d'empreintes brutes.</li>
                        </ul>

                        <h3>4. Isolation Architecturale des Données (Garantie Anti-Mélange)</h3>
                        <p>Chaque organisation abonnée dispose de son propre anneau de base de données relationnelle dédié. Les tables opérationnelles, registres financiers et données de membres sont physiquement et logiquement isolés de tous les autres clients.</p>

                        <h3>5. Clients Périphériques, Cache SQLite Hors Ligne et Pilotes Matériels</h3>
                        <p>L'application de bureau Windows et les applications mobiles prennent en charge le fonctionnement hors ligne grâce à une base SQLite chiffrée locale (SQLCipher AES-256). Les pilotes de périphériques (imprimantes thermiques de tickets ESC/POS, lecteurs de codes-barres) traitent les flux en mémoire volatile sans écriture sur disque non chiffré.</p>

                        <h3>6. Vos Droits et Contact DPO</h3>
                        <p>Conformément au RGPD et aux lois internationales, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Pour toute demande, contactez notre DPO via notre <a href="/support/contact?type=General">Centre d'Assistance Juridique</a> ou à notre siège social : 100 Bishopsgate, Londres EC2N 4AG, Royaume-Uni.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "terms-of-use",
                    Title = "Conditions d'Utilisation et Contrat d'Abonnement Entreprise",
                    Category = "Conditions & Licences Entreprise",
                    Summary = "Le cadre contractuel régissant les abonnements d'entreprise, le déploiement d'instances cloud dédiées, l'octroi de licences logicielles et les engagements de niveau de service.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "fr",
                    SortOrder = 2,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Portée de l'Accord &amp; Octroi de Licence</h3>
                        <p>Le présent Contrat Cadre d'Abonnement (« Contrat ») lie juridiquement Ozikol et le Client (« Vous » ou « Client ») pour l'accès aux services Ozikol Cloud, consoles MIS, applications mobiles et logiciels de bureau Windows.</p>

                        <h3>2. Garantie de Propriété Totale des Données Client (100 %)</h3>
                        <p><strong>Le Client conserve la propriété pleine, exclusive et inaliénable de toutes les données, registres, médias et documents créés ou téléversés dans son instance dédiée.</strong> Ozikol ne revendique aucun droit de propriété intellectuelle sur vos données. Le Client peut exporter l'intégralité de sa base de données (SQL, BACPAC, JSON, CSV) à tout moment.</p>

                        <h3>3. Engagement de Niveau de Service (SLA 99,99 %)</h3>
                        <p>Ozikol s'engage à fournir un taux de disponibilité mensuel de <strong>99,99 %</strong> pour les flux de production cloud. En cas de disponibilité inférieure, des crédits de service sont attribués : 10 % de crédit (entre 99,90 % et 99,98 %), 25 % de crédit (entre 99,50 % et 99,89 %) et 50 % de crédit (en dessous de 99,50 %).</p>

                        <h3>4. Sécurité des Comptes &amp; Obligation MFA</h3>
                        <p>Le Client s'engage à imposer l'authentification multifacteur (MFA) à tous les administrateurs et contrôleurs financiers pour préserver la sécurité du système.</p>

                        <h3>5. Droit Applicable &amp; Règlement des Litiges</h3>
                        <p>Le présent Contrat est régi par le droit d'Angleterre et du pays de Galles. Tout litige non résolu à l'amiable dans un délai de 30 jours sera soumis à l'arbitrage contraignant de la Cour d'arbitrage international de Londres (LCIA).</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "cookies",
                    Title = "Politique relative aux Cookies et Technologies de Traçage",
                    Category = "Cookies & Stockage Local",
                    Summary = "Aperçu clair et transparent des cookies fonctionnels, des jetons de sécurité et de notre engagement strict sans cookies publicitaires tiers.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2025, 10, 3, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "fr",
                    SortOrder = 3,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Fonctionnement des Cookies &amp; Stockage Web</h3>
                        <p>Ozikol utilise des cookies, le stockage HTML5 LocalStorage et des jetons chiffrés strictement pour assurer l'authentification sécurisée des utilisateurs, la protection contre les attaques CSRF et la mémorisation des préférences de langue et d'affichage.</p>

                        <h3>2. Garantie Zéro Traqueur Publicitaire</h3>
                        <div class="oz-legal-callout oz-legal-callout--success">
                            <p><strong>Environnement Sans Publicité :</strong> Ozikol ne déploie aucun cookie publicitaire tiers, aucun pixel de reciblage (Facebook, Google Ads, TikTok) et ne vend aucune donnée de navigation.</p>
                        </div>

                        <h3>3. Inventaire des Cookies de la Plateforme</h3>
                        <table class="oz-legal-table">
                            <thead>
                                <tr>
                                    <th>Nom du Cookie / Clé</th>
                                    <th>Catégorie</th>
                                    <th>Finalité</th>
                                    <th>Durée</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>.AspNetCore.Antiforgery.*</code></td>
                                    <td>Strictement Nécessaire</td>
                                    <td>Jeton de sécurité contre les attaques CSRF (Cross-Site Request Forgery).</td>
                                    <td>Session</td>
                                </tr>
                                <tr>
                                    <td><code>.AspNetCore.Identity.Application</code></td>
                                    <td>Strictement Nécessaire</td>
                                    <td>Jeton de session chiffré authentifiant les administrateurs et membres connectés.</td>
                                    <td>7 Jours</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_culture</code></td>
                                    <td>Préférence Fonctionnelle</td>
                                    <td>Mémorise la langue de l'interface (Anglais, Français, Espagnol, Allemand).</td>
                                    <td>1 An</td>
                                </tr>
                                <tr>
                                    <td><code>ozikol_cookie_consent</code></td>
                                    <td>Préférence Fonctionnelle</td>
                                    <td>Enregistre votre acceptation des paramètres de cookies.</td>
                                    <td>1 An</td>
                                </tr>
                            </tbody>
                        </table>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "privacy-choices",
                    Title = "Portail de Vos Choix de Confidentialité et Droits des Personnes",
                    Category = "Confidentialité & Droits",
                    Summary = "Guide pratique et procédures pour exercer vos droits légaux d'accès, de rectification, de portabilité et d'effacement sous le RGPD et les lois internationales.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "fr",
                    SortOrder = 4,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Souveraineté et Contrôle des Données Personnelles</h3>
                        <p>Ozikol vous garantit des contrôles directs pour exercer vos droits prévus par le Règlement Général sur la Protection des Données (RGPD) et les normes internationales de confidentialité.</p>

                        <h3>2. Vos Droits Légaux</h3>
                        <ul>
                            <li><strong>Droit d'accès et d'information :</strong> Obtenez une copie complète de vos données personnelles détenues.</li>
                            <li><strong>Droit de rectification :</strong> Corrigez vos informations inexactes ou incomplètes.</li>
                            <li><strong>Droit à l'effacement (« Droit à l'oubli ») :</strong> Demandez la suppression permanente de vos données non soumises à obligation légale de conservation.</li>
                            <li><strong>Droit à la portabilité :</strong> Recevez vos données dans un format structuré et lisible par machine (JSON/CSV).</li>
                            <li><strong>Droit d'opposition :</strong> Opposez-vous au traitement basé sur des intérêts légitimes.</li>
                        </ul>

                        <h3>3. Procédure de Demande de Droits (DSAR)</h3>
                        <p>Les demandes vérifiées sont traitées sous 30 jours sans frais. Soumettez votre demande via notre <a href="/support/contact?type=General">Guichet des Droits des Personnes</a>.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "policies-and-reports",
                    Title = "Gouvernance d'Entreprise, Politiques et Rapports de Conformité",
                    Category = "Gouvernance & Conformité",
                    Summary = "Répertoire public des chartes de gouvernance d'Ozikol, certifications ISO 27001, attestations SOC 2 Type II et normes d'accessibilité.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 3, 19, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "fr",
                    SortOrder = 5,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Cadre de Gouvernance et Éthique Institutionnelle</h3>
                        <p>Ozikol applique les normes les plus strictes de transparence, d'intégrité et de responsabilité d'entreprise sous la supervision de son conseil d'administration et de son comité d'audit.</p>

                        <h3>2. Répertoire des Politiques de Conformité</h3>
                        <ul>
                            <li><strong>Système de Gestion de la Sécurité (ISO/IEC 27001:2022) :</strong> Contrôles techniques rigoureux, analyses de code statiques hebdomadaires et tests d'intrusion trimestriels.</li>
                            <li><strong>Cadre SOC 2 Type II :</strong> Audit annuel indépendant certifiant nos contrôles de sécurité, disponibilité et confidentialité.</li>
                            <li><strong>Plan de Continuité d'Activité (BCDR) :</strong> Sauvegardes géo-redondantes avec un objectif de point de récupération (RPO) &lt; 15 min et un objectif de temps de récupération (RTO) &lt; 2 h.</li>
                            <li><strong>Accessibilité Numérique (WCAG 2.1 Niveau AA) :</strong> Conception accessible à tous les utilisateurs avec navigation intégrale au clavier et support des lecteurs d'écran.</li>
                            <li><strong>Lutte contre l'Esclavage Moderne :</strong> Tolérance zéro envers le travail forcé dans notre chaîne d'approvisionnement matériel et cloud.</li>
                        </ul>
                    """
                },
                // ==========================================
                // SPANISH (ES) LEGAL DOCUMENTS
                // ==========================================
                new MasterLegalDocument
                {
                    Slug = "privacy-notice",
                    Title = "Aviso Maestro de Privacidad y Carta de Soberanía de Datos",
                    Category = "Privacidad & Protección de Datos",
                    Summary = "Transparencia legal exhaustiva sobre cómo Ozikol aísla, procesa, protege y respeta los datos institucionales en nuestras 9 suites operativas, portales web, MIS ejecutivo, apps móviles y clientes de escritorio.",
                    Version = "2026.3",
                    EffectiveDate = new DateTime(2026, 4, 17, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "es",
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Alcance Ejecutivo y Contexto de la Plataforma</h3>
                        <p>En Ozikol («Ozikol», «nosotros» o «nuestro»), la protección de la soberanía, la privacidad y la integridad de los datos de nuestras organizaciones clientes es fundamental. Este Aviso de Privacidad rige para todos los usuarios, administradores institucionales, personal y residentes que interactúan con nuestro ecosistema a través de la web, sistemas MIS, aplicaciones móviles y software de escritorio de Windows.</p>

                        <div class="oz-legal-callout oz-legal-callout--info">
                            <p><strong>Principio Clave de Privacidad:</strong> No vendemos datos de usuarios, no rastreamos actividad con fines publicitarios de terceros y nunca entrenamos modelos públicos de inteligencia artificial con los registros privados de su organización.</p>
                        </div>

                        <h3>2. Responsable vs. Encargado del Tratamiento</h3>
                        <p>Bajo el RGPD y normativas internacionales, cuando una organización suscriptora utiliza Ozikol para administrar sus listas de miembros, cuotas y accesos, actúa como <strong>Responsable del Tratamiento</strong>. Ozikol actúa estrictamente como <strong>Encargado del Tratamiento</strong> siguiendo las instrucciones documentadas de la organización.</p>

                        <h3>3. Aislamiento Arquitectónico de Datos</h3>
                        <p>Cada organización dispone de un anillo de base de datos relacional exclusivo. <strong>No mezclamos registros de diferentes clientes en tablas compartidas</strong>, garantizando un aislamiento total contra accesos no autorizados.</p>

                        <h3>4. Aplicaciones Locales y Privacidad de Periféricos</h3>
                        <p>Nuestra aplicación de escritorio para Windows opera en modo sin conexión con bases de datos SQLite cifradas (SQLCipher AES-256). Los controladores de periféricos (impresoras térmicas de tickets ESC/POS, lectores de códigos de barras) procesan datos en memoria volátil sin persistirlos en discos desprotegidos.</p>

                        <h3>5. Derechos del Interesado y Contacto DPO</h3>
                        <p>Puede ejercer sus derechos de acceso, rectificación, supresión, limitación y portabilidad a través de nuestro <a href="/support/contact?type=General">Departamento Legal</a> o por correo postal a: 100 Bishopsgate, Londres EC2N 4AG, Reino Unido.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "terms-of-use",
                    Title = "Términos de Uso y Acuerdo Maestro de Suscripción Corporativa",
                    Category = "Términos & Licencias Corporativas",
                    Summary = "El marco contractual vinculante que rige las suscripciones corporativas, el aprovisionamiento de instancias cloud dedicadas, licencias de software y compromisos de nivel de servicio.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "es",
                    SortOrder = 2,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Acuerdo Legal y Licencia Corporativa</h3>
                        <p>Este Acuerdo Maestro de Suscripción («Acuerdo») constituye un contrato vinculante entre Ozikol y la entidad u organización suscriptora («Cliente») para el uso de los servicios en la nube, portales web y aplicaciones nativas.</p>

                        <h3>2. Propiedad Total de los Datos del Cliente (100 %)</h3>
                        <p><strong>El Cliente retiene la propiedad total, exclusiva e irrestricta de todos los datos, registros y transacciones alojados en su instancia dedicada.</strong> Ozikol no posee derechos sobre sus datos y permite su exportación completa en formatos abiertos (SQL, BACPAC, JSON, CSV) en cualquier momento.</p>

                        <h3>3. Nivel de Servicio Garantizado (99,99 % Uptime)</h3>
                        <p>Ozikol garantiza una disponibilidad mensual del 99,99 %. Si la disponibilidad mensual cae por debajo de este umbral, se otorgarán créditos de servicio proporcionales en la siguiente factura.</p>

                        <h3>4. Ley Aplicable y Jurisdicción</h3>
                        <p>Este Acuerdo se rige por las leyes de Inglaterra y Gales. Las disputas se someterán a arbitraje vinculante bajo el reglamento de la Corte de Arbitraje Internacional de Londres (LCIA).</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "cookies",
                    Title = "Política de Cookies y Tecnologías de Rastreo",
                    Category = "Cookies & Almacenamiento Local",
                    Summary = "Detalle exhaustivo de cookies operativas, tokens de autenticación y nuestra garantía estricta de cero publicidad de terceros.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2025, 10, 3, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "es",
                    SortOrder = 3,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Uso de Cookies y Almacenamiento Web</h3>
                        <p>Ozikol utiliza cookies y almacenamiento local estrictamente para gestionar sesiones seguras, prevenir ataques CSRF y conservar preferencias funcionales como el idioma seleccionado.</p>

                        <h3>2. Garantía de Cero Rastreadores Publicitarios</h3>
                        <p>Ozikol no emplea cookies publicitarias de terceros, píxeles de redes sociales ni scripts de comercialización de datos.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "privacy-choices",
                    Title = "Portal de Opciones de Privacidad y Derechos del Interesado",
                    Category = "Privacidad & Derechos",
                    Summary = "Procedimientos directos para ejercer derechos de acceso, rectificación, portabilidad y supresión bajo el RGPD y normativas internacionales.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "es",
                    SortOrder = 4,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Soberanía sobre sus Datos Personales</h3>
                        <p>Ozikol le proporciona mecanismos transparentes para ejercer sus derechos estatutarios de protección de datos personales.</p>
                        <ul>
                            <li><strong>Derecho de Acceso:</strong> Solicite copia de sus datos procesados.</li>
                            <li><strong>Derecho de Rectificación:</strong> Modifique información desactualizada o incompleta.</li>
                            <li><strong>Derecho de Supresión:</strong> Solicite la eliminación de registros personales cuando no apliquen obligaciones legales de conservación.</li>
                            <li><strong>Derecho a la Portabilidad:</strong> Descargue sus datos en formatos estructurados (JSON/CSV).</li>
                        </ul>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "policies-and-reports",
                    Title = "Gobernanza Corporativa, Políticas e Informes de Cumplimiento",
                    Category = "Gobernanza & Cumplimiento",
                    Summary = "Directorio institucional de políticas de seguridad ISO 27001, informes SOC 2 Tipo II, accesibilidad WCAG y ética empresarial.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 3, 19, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "es",
                    SortOrder = 5,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Gobernanza Corporativa y Estándares Éticos</h3>
                        <p>Ozikol opera bajo principios rigurosos de cumplimiento normativo, ciberseguridad y transparencia institucional.</p>
                        <ul>
                            <li><strong>ISO/IEC 27001:2022:</strong> Gestión de seguridad de la información con auditorías periódicas.</li>
                            <li><strong>SOC 2 Tipo II:</strong> Exámenes independientes sobre seguridad, confidencialidad y disponibilidad.</li>
                            <li><strong>Accesibilidad (WCAG 2.1 AA):</strong> Portales adaptados para navegación por teclado y lectores de pantalla.</li>
                        </ul>
                    """
                },
                // ==========================================
                // GERMAN (DE) LEGAL DOCUMENTS
                // ==========================================
                new MasterLegalDocument
                {
                    Slug = "privacy-notice",
                    Title = "Master-Datenschutzerklärung und Charta zur Datensouveränität",
                    Category = "Datenschutz & Datensouveränität",
                    Summary = "Umfassende Transparenz darüber, wie Ozikol institutionelle Daten über unsere 9 Betriebs-Suiten, Webportale, Executive MIS, Mobil-Apps und Windows Desktop-Clients isoliert, verarbeitet und schützt.",
                    Version = "2026.3",
                    EffectiveDate = new DateTime(2026, 4, 17, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "de",
                    SortOrder = 1,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Geltungsbereich und Architekturkontext</h3>
                        <p>Bei Ozikol („Ozikol“, „wir“ oder „uns“) ist der Schutz der Souveränität, Vertraulichkeit und Integrität der Daten unserer Kundenorganisationen grundlegend. Diese Datenschutzerklärung gilt für alle Nutzer über Webportale, dedizierte Organisationsinstanzen, Management-Informationssysteme (MIS), native Mobil-Apps und Windows-Desktop-Clients.</p>

                        <div class="oz-legal-callout oz-legal-callout--info">
                            <p><strong>Datenschutzprinzip:</strong> Wir verkaufen keine Nutzerdaten, verwenden keine Werbetracker Dritter und trainieren niemals öffentliche KI-Modelle mit den privaten Unternehmensdaten unserer Kunden.</p>
                        </div>

                        <h3>2. Verantwortlicher vs. Auftragsverarbeiter (DSGVO)</h3>
                        <p>Wenn Organisationen Ozikol für Mitgliederregister, Beitragsverwaltung und Zugangskontrollen einsetzen, fungieren sie als <strong>Verantwortlicher</strong> im Sinne der DSGVO. Ozikol handelt ausschließlich als <strong>Auftragsverarbeiter</strong> gemäß den dokumentierten Weisungen.</p>

                        <h3>3. Vollständige Mandantenisolation</h3>
                        <p>Jede Kundenorganisation erhält einen dedizierten relationalen Datenbankspeicherring. <strong>Es findet keine Vermischung von Datensätzen in geteilten Tabellen statt.</strong></p>

                        <h3>4. Rechte der betroffenen Person und Datenschutzbeauftragter</h3>
                        <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Kontaktieren Sie unseren Datenschutzbeauftragten über unser <a href="/support/contact?type=General">Rechtsportal</a> oder per Post: 100 Bishopsgate, London EC2N 4AG, Vereinigtes Königreich.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "terms-of-use",
                    Title = "Nutzungsbedingungen und Rahmen-Abonnementvertrag für Unternehmen",
                    Category = "Bedingungen & Unternehmenslizenzen",
                    Summary = "Der verbindliche Vertragsrahmen für Unternehmensabonnements, dedizierte Cloud-Instanzen, Client-Softwarelizenzen und Service-Level-Agreements.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "de",
                    SortOrder = 2,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Vertragsabschluss und Lizenzumfang</h3>
                        <p>Dieser Rahmenvertrag („Vertrag“) regelt die Bereitstellung von Ozikol Cloud-Diensten, MIS-Konsolen und Client-Software für die abonnierende Organisation („Kunde“).</p>

                        <h3>2. 100 % Kundendateneigentum</h3>
                        <p><strong>Der Kunde behält das alleinige und uneingeschränkte Eigentum an sämtlichen Daten, Registern und Finanztransaktionen in seiner dedizierten Instanz.</strong> Ein vollständiger Datenexport (SQL, BACPAC, JSON, CSV) ist jederzeit möglich.</p>

                        <h3>3. Verfügbarkeitsgarantie (99,99 % Uptime)</h3>
                        <p>Ozikol garantiert eine monatliche Systemverfügbarkeit von 99,99 % mit gestaffelten Service-Gutschriften bei Unterschreitung.</p>

                        <h3>4. Anwendbares Recht und Gerichtsstand</h3>
                        <p>Dieser Vertrag unterliegt dem Recht von England und Wales. Streitigkeiten werden durch ein Schiedsverfahren beim London Court of International Arbitration (LCIA) entschieden.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "cookies",
                    Title = "Richtlinie zu Cookies und Tracking-Technologien",
                    Category = "Cookies & Gerätespeicher",
                    Summary = "Detaillierte Übersicht über betriebsnotwendige Cookies, Sicherheitstoken und unsere strikte Garantie gegen Werbetracker von Drittanbietern.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2025, 10, 3, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "de",
                    SortOrder = 3,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Verwendung von Cookies und Web-Storage</h3>
                        <p>Ozikol verwendet Cookies und lokalen Speicher ausschließlich für die Sitzungssicherheit, CSRF-Schutz und funktionale Spracheinstellungen.</p>

                        <h3>2. Null-Werbetracker-Garantie</h3>
                        <p>Wir verwenden keine Marketing-Cookies, Social-Media-Pixel oder Tracking-Tools von Drittanbietern.</p>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "privacy-choices",
                    Title = "Portal für Datenschutz-Präferenzen und Betroffenenrechte",
                    Category = "Datenschutz & Betroffenenrechte",
                    Summary = "Praktische Anleitungen zur Ausübung Ihrer gesetzlichen Rechte auf Auskunft, Berichtigung, Datenübertragbarkeit und Löschung gemäß DSGVO.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "de",
                    SortOrder = 4,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Ausübung Ihrer Betroffenenrechte</h3>
                        <p>Ozikol bietet Ihnen transparente Möglichkeiten zur Wahrnehmung Ihrer Rechte nach der europäischen DSGVO:</p>
                        <ul>
                            <li><strong>Recht auf Auskunft:</strong> Erhalt einer Bestätigung und Kopie der verarbeiteten Daten.</li>
                            <li><strong>Recht auf Berichtigung:</strong> Korrektur unvollständiger oder unrichtiger Angaben.</li>
                            <li><strong>Recht auf Löschung („Recht auf Vergessenwerden“):</strong> Löschung personenbezogener Daten ohne gesetzliche Aufbewahrungspflicht.</li>
                            <li><strong>Recht auf Datenübertragbarkeit:</strong> Bereitstellung in einem gängigen, maschinenlesbaren Format (JSON/CSV).</li>
                        </ul>
                    """
                },
                new MasterLegalDocument
                {
                    Slug = "policies-and-reports",
                    Title = "Unternehmensführung, Richtlinien und Compliance-Berichte",
                    Category = "Governance & Compliance",
                    Summary = "Öffentliches Register für Ozikols Sicherheitszertifizierungen (ISO 27001), SOC 2 Berichte, Barrierefreiheitsstandards und ethische Richtlinien.",
                    Version = "2026.2",
                    EffectiveDate = new DateTime(2026, 3, 19, 0, 0, 0, DateTimeKind.Utc),
                    LastUpdatedUtc = new DateTime(2026, 9, 5, 0, 0, 0, DateTimeKind.Utc),
                    Culture = "de",
                    SortOrder = 5,
                    IsPublished = true,
                    ContentHtml = """
                        <h3>1. Corporate Governance und Sicherheitsstandards</h3>
                        <p>Ozikol verpflichtet sich zu höchsten Standards bei Datensicherheit, Integrität und ethischer Unternehmensführung.</p>
                        <ul>
                            <li><strong>ISO/IEC 27001:2022:</strong> Zertifiziertes Informationssicherheits-Managementsystem.</li>
                            <li><strong>SOC 2 Typ II:</strong> Jährliche Prüfungen der Kontrollen für Sicherheit, Verfügbarkeit und Vertraulichkeit.</li>
                            <li><strong>Barrierefreiheit (WCAG 2.1 AA):</strong> Barrierefreie Portale für alle Nutzer mit vollständiger Tastaturnavigation.</li>
                        </ul>
                    """
                }
            };'''

new_code = code.replace(target_end, replacement)

with open(seeder_path, "w", encoding="utf-8") as f:
    f.write(new_code)

print("Successfully injected FR, ES, and DE legal documents into MasterCatalogDataSeeder.cs!")
