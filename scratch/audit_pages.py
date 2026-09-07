import os
import re

pages_dir = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Pages"
layout_path = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Pages\Shared\_Layout.cshtml"

with open(layout_path, "r", encoding="utf-8") as f:
    layout_content = f.read()

# Separate Header / Menu and Footer from layout
header_end = layout_content.find("<main")
if header_end == -1:
    header_end = layout_content.find("role=\"main\"")
header_menu_content = layout_content[:header_end]
footer_content = layout_content[header_end:]

# Also get all links in header and footer
def extract_links(html):
    # Match href attributes
    matches = re.findall(r'href=[\'"]([^\'"]+)[\'"]', html)
    normalized = set()
    for m in matches:
        # Strip culture prefixes like /@currentCulture
        cleaned = re.sub(r'^/@currentCulture', '', m)
        cleaned = re.sub(r'^/en|^/fr|^/es|^/de', '', cleaned)
        cleaned = cleaned.split('?')[0].split('#')[0].rstrip('/')
        if not cleaned:
            cleaned = '/'
        normalized.add(cleaned.lower())
    return normalized

menu_links = extract_links(header_menu_content)
footer_links = extract_links(footer_content)

print(f"Total unique Menu links: {len(menu_links)}")
print(f"Total unique Footer links: {len(footer_links)}")

# Walk all cshtml files in Pages
page_results = []

for root, dirs, files in os.walk(pages_dir):
    # skip Shared folder
    if "Shared" in root:
        continue
    for file in files:
        if not file.endswith(".cshtml") or file.startswith("_"):
            continue

        full_path = os.path.join(root, file)
        rel_path = os.path.relpath(full_path, pages_dir).replace("\\", "/")

        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check @page directive
        page_match = re.search(r'@page\s*(?:"([^"]*)")?', content)
        if not page_match:
            continue  # Not a Razor page

        custom_route = page_match.group(1) if page_match.group(1) else None

        # Determine route link
        # Default route from relative path
        route = "/" + rel_path[:-7].lower() # strip .cshtml
        if route.endswith("/index"):
            route = route[:-6]
            if not route:
                route = "/"

        if custom_route:
            if custom_route.startswith("/"):
                route = custom_route.lower()
            else:
                # relative to folder
                folder = "/" + os.path.dirname(rel_path).lower()
                if folder == "/":
                    route = "/" + custom_route.lower()
                else:
                    route = folder + "/" + custom_route.lower()

        # Route aliases from Program.cs:
        # /Auth/GetStarted -> /get-started or /auth/get-started
        # /Auth/Login -> /login or /auth/login
        # /Auth/WorkspaceSetupDetails -> /workspace-setup-details or /auth/workspace-setup-details
        aliases = [route]
        if route == "/auth/getstarted":
            aliases.extend(["/get-started", "/auth/get-started"])
        elif route == "/auth/login":
            aliases.extend(["/login", "/auth/login"])
        elif route == "/auth/workspacesetupdetails":
            aliases.extend(["/workspace-setup-details", "/auth/workspace-setup-details"])

        # Page Name
        title_match = re.search(r'ViewData\["Title"\]\s*=\s*(?:SharedLocalizer\["([^"]+)"\]|"([^"]+)")', content)
        if title_match:
            page_name = title_match.group(1) or title_match.group(2)
        else:
            page_name = file[:-7]

        # Is in Menu
        in_menu = any(a in menu_links for a in aliases)
        # Check sub-paths or features
        if not in_menu:
            # Check if route is linked directly in header
            for a in aliases:
                if a in header_menu_content.lower():
                    in_menu = True
                    break

        # Is in Footer
        in_footer = any(a in footer_links for a in aliases)
        if not in_footer:
            for a in aliases:
                if a in footer_content.lower():
                    in_footer = True
                    break

        # Check translation status:
        # A page is translated if:
        # 1. It uses @SharedLocalizer or IStringLocalizer or dynamic MasterLegalDocument / database localization
        # 2. It does not contain prominent untranslated UI paragraphs
        uses_localizer = bool(re.search(r'@SharedLocalizer\[|IStringLocalizer|MasterLegalDocument', content))
        
        # Check for potential hardcoded strings
        # Look for plain text in h1, h2, h3, h4, p, a, button that doesn't have @
        # We can score or check
        page_results.append({
            "name": page_name,
            "file": file,
            "rel_path": rel_path,
            "route": aliases[0] if len(aliases) == 1 else aliases[1],
            "in_menu": in_menu,
            "in_footer": in_footer,
            "is_translated": uses_localizer,
            "aliases": aliases
        })

print(f"Total Razor Pages found: {len(page_results)}")
for p in sorted(page_results, key=lambda x: x["route"]):
    print(f"{p['route']} | Menu: {p['in_menu']} | Footer: {p['in_footer']} | Translated: {p['is_translated']} | {p['rel_path']}")
