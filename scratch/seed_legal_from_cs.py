import pyodbc
import re
import uuid
from datetime import datetime

conn_str = 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=JSS\\SQLEXPRESS;DATABASE=Ozikol_MasterCatalogDb;Trusted_Connection=yes;TrustServerCertificate=yes;'

def parse_and_seed():
    seeder_path = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.MasterPersistence.EF.MasterSQL\Seeding\MasterCatalogDataSeeder.cs"
    with open(seeder_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find SeedLegalDocumentsAsync
    start_marker = "public static async Task SeedLegalDocumentsAsync"
    idx = content.find(start_marker)
    if idx == -1:
        raise Exception("Could not find SeedLegalDocumentsAsync")
    
    sub = content[idx:]
    
    # Each document starts with 'new MasterLegalDocument'
    blocks = sub.split("new MasterLegalDocument")[1:]
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()

    inserted = 0
    updated = 0

    for b in blocks:
        # Extract fields
        slug_m = re.search(r'Slug\s*=\s*"([^"]+)"', b)
        title_m = re.search(r'Title\s*=\s*"([^"]+)"', b)
        category_m = re.search(r'Category\s*=\s*"([^"]+)"', b)
        summary_m = re.search(r'Summary\s*=\s*"([^"]+)"', b)
        version_m = re.search(r'Version\s*=\s*"([^"]+)"', b)
        culture_m = re.search(r'Culture\s*=\s*"([^"]+)"', b)
        sort_m = re.search(r'SortOrder\s*=\s*(\d+)', b)
        pub_m = re.search(r'IsPublished\s*=\s*(true|false)', b, re.IGNORECASE)
        
        # ContentHtml is in """ ... """
        content_m = re.search(r'ContentHtml\s*=\s*"""(.*?)"""', b, re.DOTALL)
        
        if not (slug_m and title_m and culture_m and content_m):
            continue
            
        slug = slug_m.group(1).strip()
        title = title_m.group(1).strip()
        category = category_m.group(1).strip() if category_m else "General"
        summary = summary_m.group(1).strip() if summary_m else ""
        version = version_m.group(1).strip() if version_m else "2026.1"
        culture = culture_m.group(1).strip()
        sort_order = int(sort_m.group(1)) if sort_m else 1
        is_published = True if pub_m and pub_m.group(1).lower() == 'true' else False
        content_html = content_m.group(1).strip().replace('""', '"')

        effective_date = datetime(2026, 4, 17)
        last_updated = datetime(2026, 9, 5)
        created_utc = datetime.utcnow()

        # Check existing
        cursor.execute("SELECT Id FROM MasterLegalDocuments WHERE Slug = ? AND Culture = ?", (slug, culture))
        row = cursor.fetchone()

        if row:
            cursor.execute("""
                UPDATE MasterLegalDocuments
                SET Title = ?, Category = ?, Summary = ?, Version = ?, EffectiveDate = ?,
                    LastUpdatedUtc = ?, ContentHtml = ?, SortOrder = ?, IsPublished = ?
                WHERE Id = ?
            """, (title, category, summary, version, effective_date, last_updated, content_html, sort_order, is_published, row[0]))
            updated += 1
        else:
            doc_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO MasterLegalDocuments
                (Id, Slug, Title, Category, Summary, ContentHtml, Version, EffectiveDate, LastUpdatedUtc, Culture, IsPublished, SortOrder, CreatedUtc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, slug, title, category, summary, content_html, version, effective_date, last_updated, culture, is_published, sort_order, created_utc))
            inserted += 1

    conn.commit()
    print(f"Legal documents seeding completed. Inserted: {inserted}, Updated: {updated}")

    # Verify count
    cursor.execute("SELECT Culture, Slug, Title FROM MasterLegalDocuments ORDER BY Culture, SortOrder")
    rows = cursor.fetchall()
    print(f"Total rows in MasterLegalDocuments: {len(rows)}")
    for r in rows:
        print(f"[{r[0]}] {r[1]} -> {r[2][:40]}...")

if __name__ == '__main__':
    parse_and_seed()
