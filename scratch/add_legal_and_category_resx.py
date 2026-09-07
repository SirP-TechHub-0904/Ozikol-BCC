import os
import xml.etree.ElementTree as ET

resources_dir = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Resources"

translations = {
    "en": {
        "Legal_Breadcrumb_Home": "Home",
        "Legal_Breadcrumb_Hub": "Legal & Governance",
        "Legal_Breadcrumb_Back": "Back to Portal",
        "Legal_Meta_LastUpdated": "Last Updated",
        "Legal_Meta_Effective": "Effective",
        "Legal_Meta_Version": "Version",
        "Legal_Meta_Print": "Print Policy",
        "Legal_Nav_Title": "Legal & Governance Hub",
        "Legal_Nav_PrivacyNotice": "Privacy Notice",
        "Legal_Nav_TermsOfUse": "Terms of Use",
        "Legal_Nav_Cookies": "Cookie Policy",
        "Legal_Nav_PrivacyChoices": "Privacy Choices",
        "Legal_Nav_PoliciesReports": "Corporate Policies & Reports",
        "Legal_Help_Title": "Need Legal Clarification?",
        "Legal_Help_Desc": "Our dedicated data sovereignty and regulatory compliance team is available to address enterprise institutional queries.",
        "Legal_Help_Btn": "Contact Legal Desk",
        "Legal_Fallback_Notice": "This legal document is currently displayed in its reference language (English).",
        "Category_Support": "Technical Support",
        "Category_Sales": "Enterprise Sales",
        "Category_Billing": "Billing & Invoicing",
        "Category_Partnership": "Partnership & Affiliates",
        "Category_Enterprise": "Enterprise Solutions",
        "Category_General": "General Inquiries",
        "Category_SecurityCompliance": "Security & Compliance"
    },
    "fr": {
        "Legal_Breadcrumb_Home": "Accueil",
        "Legal_Breadcrumb_Hub": "Légal & Gouvernance",
        "Legal_Breadcrumb_Back": "Retour au portail",
        "Legal_Meta_LastUpdated": "Dernière mise à jour",
        "Legal_Meta_Effective": "Date d'effet",
        "Legal_Meta_Version": "Version",
        "Legal_Meta_Print": "Imprimer la politique",
        "Legal_Nav_Title": "Centre Légal & Gouvernance",
        "Legal_Nav_PrivacyNotice": "Notice de Confidentialité",
        "Legal_Nav_TermsOfUse": "Conditions d'Utilisation",
        "Legal_Nav_Cookies": "Politique des Cookies",
        "Legal_Nav_PrivacyChoices": "Vos Choix de Confidentialité",
        "Legal_Nav_PoliciesReports": "Politiques & Rapports",
        "Legal_Help_Title": "Besoin d'éclaircissements légaux ?",
        "Legal_Help_Desc": "Notre équipe dédiée à la souveraineté des données et à la conformité réglementaire est à votre disposition pour toute demande institutionnelle.",
        "Legal_Help_Btn": "Contacter le service juridique",
        "Legal_Fallback_Notice": "Ce document juridique est actuellement affiché dans sa langue de référence (anglais).",
        "Category_Support": "Support Technique",
        "Category_Sales": "Ventes Entreprise",
        "Category_Billing": "Facturation & Finance",
        "Category_Partnership": "Partenariats & Affiliés",
        "Category_Enterprise": "Solutions Entreprise",
        "Category_General": "Demandes Générales",
        "Category_SecurityCompliance": "Sécurité & Conformité"
    },
    "es": {
        "Legal_Breadcrumb_Home": "Inicio",
        "Legal_Breadcrumb_Hub": "Legal y Gobernanza",
        "Legal_Breadcrumb_Back": "Volver al portal",
        "Legal_Meta_LastUpdated": "Última actualización",
        "Legal_Meta_Effective": "Fecha de vigencia",
        "Legal_Meta_Version": "Versión",
        "Legal_Meta_Print": "Imprimir política",
        "Legal_Nav_Title": "Centro Legal y de Gobernanza",
        "Legal_Nav_PrivacyNotice": "Aviso de Privacidad",
        "Legal_Nav_TermsOfUse": "Términos de Uso",
        "Legal_Nav_Cookies": "Política de Cookies",
        "Legal_Nav_PrivacyChoices": "Opciones de Privacidad",
        "Legal_Nav_PoliciesReports": "Políticas Corporativas e Informes",
        "Legal_Help_Title": "¿Necesita aclaraciones legales?",
        "Legal_Help_Desc": "Nuestro equipo dedicado a la soberanía de datos y cumplimiento normativo está disponible para resolver consultas institucionales.",
        "Legal_Help_Btn": "Contactar al Departamento Legal",
        "Legal_Fallback_Notice": "Este documento legal se muestra actualmente en su idioma de referencia (inglés).",
        "Category_Support": "Soporte Técnico",
        "Category_Sales": "Ventas Corporativas",
        "Category_Billing": "Facturación y Cobranza",
        "Category_Partnership": "Alianzas y Afiliados",
        "Category_Enterprise": "Soluciones Corporativas",
        "Category_General": "Consultas Generales",
        "Category_SecurityCompliance": "Seguridad y Cumplimiento"
    },
    "de": {
        "Legal_Breadcrumb_Home": "Startseite",
        "Legal_Breadcrumb_Hub": "Recht & Governance",
        "Legal_Breadcrumb_Back": "Zurück zum Portal",
        "Legal_Meta_LastUpdated": "Zuletzt aktualisiert",
        "Legal_Meta_Effective": "Gültig ab",
        "Legal_Meta_Version": "Version",
        "Legal_Meta_Print": "Richtlinie drucken",
        "Legal_Nav_Title": "Rechts- & Governance-Center",
        "Legal_Nav_PrivacyNotice": "Datenschutzerklärung",
        "Legal_Nav_TermsOfUse": "Nutzungsbedingungen",
        "Legal_Nav_Cookies": "Cookie-Richtlinie",
        "Legal_Nav_PrivacyChoices": "Datenschutz-Präferenzen",
        "Legal_Nav_PoliciesReports": "Unternehmensrichtlinien & Berichte",
        "Legal_Help_Title": "Benötigen Sie rechtliche Klärung?",
        "Legal_Help_Desc": "Unser Team für Datensouveränität und regulatorische Compliance steht Ihnen für institutionelle Unternehmensanfragen gerne zur Verfügung.",
        "Legal_Help_Btn": "Rechtsabteilung kontaktieren",
        "Legal_Fallback_Notice": "Dieses juristische Dokument wird derzeit in seiner Referenzsprache (Englisch) angezeigt.",
        "Category_Support": "Technischer Support",
        "Category_Sales": "Unternehmensvertrieb",
        "Category_Billing": "Abrechnung & Finanzen",
        "Category_Partnership": "Partnerschaften & Partner",
        "Category_Enterprise": "Unternehmenslösungen",
        "Category_General": "Allgemeine Anfragen",
        "Category_SecurityCompliance": "Sicherheit & Compliance"
    }
}

file_mapping = {
    "SharedResource.resx": "en",
    "SharedResource.en.resx": "en",
    "SharedResource.fr.resx": "fr",
    "SharedResource.es.resx": "es",
    "SharedResource.de.resx": "de",
}

for filename, lang in file_mapping.items():
    filepath = os.path.join(resources_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    dict_to_use = translations[lang]
    new_entries = []
    for key, val in dict_to_use.items():
        if f'name="{key}"' not in content:
            new_entries.append(f'  <data name="{key}" xml:space="preserve">\n    <value>{val}</value>\n  </data>')

    if new_entries:
        # Insert before </root>
        closing = "</root>"
        idx = content.rfind(closing)
        if idx != -1:
            updated_content = content[:idx] + "\n".join(new_entries) + "\n" + content[idx:]
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated_content)
            print(f"Added {len(new_entries)} keys to {filename}")
        else:
            print(f"Could not find </root> in {filename}")
    else:
        print(f"All keys already exist in {filename}")
