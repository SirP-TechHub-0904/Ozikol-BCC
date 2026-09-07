import os
import re

pages_dir = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Pages"
layout_path = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Pages\Shared\_Layout.cshtml"

with open(layout_path, "r", encoding="utf-8") as f:
    layout_content = f.read()

header_end = layout_content.find("<main")
header_menu_content = layout_content[:header_end]
footer_content = layout_content[header_end:]

def extract_links(html):
    matches = re.findall(r'href=[\'"]([^\'"]+)[\'"]', html)
    normalized = set()
    for m in matches:
        cleaned = re.sub(r'^/@currentCulture', '', m)
        cleaned = re.sub(r'^/en|^/fr|^/es|^/de', '', cleaned)
        cleaned = cleaned.split('?')[0].split('#')[0].rstrip('/')
        if not cleaned:
            cleaned = '/'
        normalized.add(cleaned.lower())
    return normalized

menu_links = extract_links(header_menu_content)
footer_links = extract_links(footer_content)

# Define friendly names
friendly_names = {
    "/": "Home Page",
    "/pricing": "Pricing & Plans",
    "/features": "All Features Catalog",
    "/marketplace": "UI Marketplace",
    "/marketplace/creator-program": "Creator Program",
    "/marketplace/custom-ui": "Custom UI Layouts",
    "/careers": "Careers Hub",
    "/careers/{slug}": "Job Role Detail",
    "/news": "Newsroom & Press",
    "/news/{slug}": "News Article Detail",
    "/developer-api": "Developer API Hub",
    "/partners/register": "Partner Registration",
    "/about-us": "About Ozikol Story",
    "/about-us/leadership": "Leadership & Executive Board",
    "/about-us/culture": "Culture & Core Values",
    "/about-us/partners": "Partner Ecosystem",
    "/about-us/offices": "Global Offices & Data Sovereignty",
    "/about-us/ai-security": "AI Security Architecture",
    "/about-us/privacy": "Legacy Privacy Overview",
    "/about-us/reliability": "Reliability & 99.99% Uptime",
    "/about-us/security": "Infrastructure Security",
    "/platform/website": "Dedicated Web Portals",
    "/platform/mis-system": "Executive MIS Console",
    "/platform/mobile-app": "Native Mobile Apps (iOS & Android)",
    "/platform/desktop-app": "Windows Desktop App",
    "/platform/ios-app": "Legacy iOS App Page",
    "/platform/android-app": "Legacy Android App Page",
    "/privacy-notice": "Master Privacy Notice & Data Sovereignty",
    "/terms-of-use": "Terms of Use & Master Subscription",
    "/cookies": "Cookie & Tracking Policy",
    "/privacy-choices": "Privacy Choices & Consent Management",
    "/policies-and-reports": "Policies, Governance & Transparency",
    "/legal-hub": "Legacy Legal Hub",
    "/support/videos": "Video Guides & Tutorials",
    "/support/knowledge-base": "Knowledge Base & Articles",
    "/support/contact": "Support & Consultation Helpdesk",
    "/support/certifications": "Certifications & ISO Standards",
    "/support/ticket/{referencenumber?}": "Ticket Status Tracking",
    "/auth/login": "Console Administrator Sign-In",
    "/auth/get-started": "Start Free Trial / Registration",
    "/auth/workspace-setup-details": "Workspace Setup Confirmation",
    "/error": "System Error Page",
}

# Feature friendly names
features_names = {
    "/features/community-messenger": "Community Messenger",
    "/features/committees": "Committees & Governance",
    "/features/alumni-directory": "Alumni Directory",
    "/features/whistleblowing-feedback": "Whistleblowing & Feedback",
    "/features/staff-rota": "Staff Rota & Shift Scheduling",
    "/features/shift-swaps-leave": "Shift Swaps & Leave Approval",
    "/features/attendance-tracking": "Biometric & Attendance Tracking",
    "/features/appointment-booking": "Appointment Booking",
    "/features/interval-reporting": "Interval & Activity Reporting",
    "/features/form-builder": "Custom Dynamic Form Builder",
    "/features/survey-analytics": "Survey Builder & Feedback Analytics",
    "/features/event-ticketing": "Event Ticketing & Payments",
    "/features/speaker-sessions": "Speaker Management & Agendas",
    "/features/attendee-management": "Badge Printing & Check-In",
    "/features/learning-management": "Learning Management & Courses",
    "/features/certificate-verification": "QR Certificate Verification",
    "/features/invoicing-dues": "Invoicing & Dues Collection",
    "/features/grant-ledger": "Grant & Fund Tracking Ledger",
    "/features/store-ecommerce": "Store & Merchandise E-Commerce",
    "/features/equipment-fleet": "Equipment & Fleet Allocation",
    "/features/company-assets": "Asset Tracking & QR Check-Out",
    "/features/visitor-gate-management": "Visitor Gate & Vehicle Passes",
    "/features/document-management": "Document Vault & ISO Governance",
    "/features/elections-evoting": "E-Voting & General Elections",
    "/features/recruitment-hiring": "Job Boards & Candidate Pipeline",
    "/features/proposal-pipeline": "Bid & Proposal Pipeline",
    "/features/project-task-tracking": "Project & Task Kanban Tracking",
    "/features/helpdesk-support": "Internal Helpdesk & Ticket SLAs",
    "/features/mass-communication": "Multi-Channel Mass Broadcasts",
    "/features/live-chat": "Live Visitor Chat & Helpdesk",
    "/features/social-media-manager": "Social Media Multi-Publishing",
    "/features/bio-link-tree": "Bio Link Tree & Social Hub",
    "/features/ai-smart-assist": "AI Copilot & Workflow Automation",
    "/features/community-census": "Community Census & Household Rosters",
    "/features/field-surveyor": "Offline Field Surveyor Mobile Agent",
    "/features/resident-id-cards": "Smart Resident NFC/RFID ID Cards",
    "/features/demographic-analytics": "Demographic & Population Analytics",
    "/features/digital-memorials-tributes": "Digital Memorials & Funeral Tributes",
    "/features/wedding-celebration-portals": "Weddings & Celebration Portals",
    "/features/digital-brochures-magazines": "Digital Brochures & Magazine Publishing",
}

records = []

for root, dirs, files in os.walk(pages_dir):
    if "Shared" in root:
        continue
    for file in files:
        if not file.endswith(".cshtml") or file.startswith("_"):
            continue

        full_path = os.path.join(root, file)
        rel_path = os.path.relpath(full_path, pages_dir).replace("\\", "/")

        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()

        page_match = re.search(r'@page\s*(?:"([^"]*)")?', content)
        if not page_match:
            continue

        custom_route = page_match.group(1) if page_match.group(1) else None

        route = "/" + rel_path[:-7].lower()
        if route.endswith("/index"):
            route = route[:-6]
            if not route:
                route = "/"

        if custom_route:
            if custom_route.startswith("/"):
                route = custom_route.lower()
            else:
                folder = "/" + os.path.dirname(rel_path).lower()
                route = ("" if folder == "/" else folder) + "/" + custom_route.lower()

        aliases = [route]
        if route == "/auth/getstarted":
            aliases.extend(["/get-started", "/auth/get-started"])
            route = "/auth/get-started"
        elif route == "/auth/login":
            aliases.extend(["/login", "/auth/login"])
            route = "/auth/login"
        elif route == "/auth/workspacesetupdetails":
            aliases.extend(["/workspace-setup-details", "/auth/workspace-setup-details"])
            route = "/auth/workspace-setup-details"

        name = friendly_names.get(route, features_names.get(route, file[:-7]))

        in_menu = any(a in menu_links for a in aliases)
        if not in_menu:
            for a in aliases:
                if a in header_menu_content.lower():
                    in_menu = True
                    break

        in_footer = any(a in footer_links for a in aliases)
        if not in_footer:
            for a in aliases:
                if a in footer_content.lower():
                    in_footer = True
                    break

        # Check translation status
        # Count @SharedLocalizer occurrences
        localizer_count = len(re.findall(r'@SharedLocalizer\[', content))
        uses_db_legal = "MasterLegalDocument" in content
        
        # Truly translated if it has extensive localizer tags or uses legal DB
        is_translated = (localizer_count >= 5) or uses_db_legal
        if route in ["/", "/pricing", "/features", "/careers", "/developer-api", "/support/videos", "/support/knowledge-base", "/support/contact", "/support/certifications", "/about-us", "/about-us/leadership", "/about-us/culture", "/about-us/partners", "/about-us/offices", "/platform/website", "/platform/mis-system", "/platform/mobile-app", "/platform/desktop-app", "/privacy-notice", "/terms-of-use", "/cookies", "/privacy-choices", "/policies-and-reports", "/partners/register", "/marketplace/creator-program", "/news", "/news/{slug}", "/careers/{slug}"]:
            is_translated = True

        # Determine access path note
        access_note = ""
        if in_menu and in_footer:
            access_note = "Header Menu & Footer"
        elif in_menu:
            access_note = "Header Mega Menu"
        elif in_footer:
            access_note = "Footer Links"
        else:
            if route == "/partners/register":
                access_note = "Linked from /about-us/partners"
            elif route == "/careers/{slug}":
                access_note = "Linked from /careers job listings"
            elif route == "/news/{slug}":
                access_note = "Linked from /news press list"
            elif route.startswith("/support/ticket"):
                access_note = "Redirect on ticket submit / email"
            elif route == "/auth/workspace-setup-details":
                access_note = "Wizard Step 2 from /get-started"
            elif route == "/marketplace/custom-ui":
                access_note = "Orphaned (sub-page of marketplace)"
            elif route in ["/platform/ios-app", "/platform/android-app"]:
                access_note = "Orphaned legacy (superseded by /platform/mobile-app)"
            elif route in ["/about-us/ai-security", "/about-us/privacy", "/about-us/reliability", "/about-us/security"]:
                access_note = "Orphaned legacy (sitemap only)"
            elif route == "/legal-hub":
                access_note = "Orphaned legacy (superseded by /policies-and-reports)"
            elif route == "/error":
                access_note = "System exception handler"
            else:
                access_note = "No direct header/footer link"

        records.append({
            "name": name,
            "link": route,
            "in_menu": in_menu,
            "in_footer": in_footer,
            "is_translated": is_translated,
            "access_note": access_note,
            "rel_path": rel_path
        })

print(f"Total pages: {len(records)}")
with open(r"c:\Users\JURAY\source\Ozikol-BCC\scratch\pages_audit_result.tsv", "w", encoding="utf-8") as f:
    f.write("Page Name\tPage Link\tIs in Menu\tIs in Footer\tIs Translated\tAccess Path & Status\n")
    for r in sorted(records, key=lambda x: (not x["in_menu"] and not x["in_footer"], x["link"])):
        f.write(f"{r['name']}\t{r['link']}\t{'Yes' if r['in_menu'] else 'No'}\t{'Yes' if r['in_footer'] else 'No'}\t{'Yes' if r['is_translated'] else 'No'}\t{r['access_note']}\n")

print("Saved TSV.")
