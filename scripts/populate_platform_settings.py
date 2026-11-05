"""
Ozikol Business Command Center — Central Platform Settings Updater
Updates MasterPlatformSettings (Id = 1) with centralized service credentials.
Uses AES-256-GCM encryption for secrets matching OzikolDataCipher specification.
"""

import os
import sys
import base64
import hashlib
import pyodbc
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 1. Master encryption key derivation matching OzikolDataCipher
master_key = os.environ.get("OZIKOL_SECURITY_MASTER_ENCRYPTION_KEY", "Ozikol_Sovereign_Master_Security_Key_2026_Secure_Bcc_Key!")
key_bytes = hashlib.sha256(master_key.encode('utf-8')).digest()

def encrypt_secret(plain_text: str | None) -> str | None:
    if not plain_text or plain_text.strip() == "":
        return None
    if plain_text.startswith("enc:v1:"):
        return plain_text
    
    aesgcm = AESGCM(key_bytes)
    iv = os.urandom(12)
    # AESGCM.encrypt in cryptography appends the 16-byte tag to the ciphertext
    ct_with_tag = aesgcm.encrypt(iv, plain_text.encode('utf-8'), None)
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    
    iv_b64 = base64.b64encode(iv).decode('utf-8')
    ct_b64 = base64.b64encode(ciphertext).decode('utf-8')
    tag_b64 = base64.b64encode(tag).decode('utf-8')
    
    return f"enc:v1:{iv_b64}:{ct_b64}:{tag_b64}"

def get_connection(conn_str: str):
    return pyodbc.connect(conn_str)

def update_platform_settings(conn_str: str):
    print("Connecting to database...")
    conn = get_connection(conn_str)
    cursor = conn.cursor()

    recaptcha_site = "6LdBsb8tAAAAAPuXWg5SLjjbPVZd0_-v1w4WbK6H"
    recaptcha_secret = encrypt_secret("6LdBsb8tAAAAAJ2JJlhMLecWdm3uRqvyNFufC8xi")

    email_provider = "Postmark"
    postmark_token = encrypt_secret("2beea79c-6d36-4da6-bb94-d4f63030baa8")
    postmark_from = "notifications@ozikol.cloud"
    email_from_name = "Ozikol Cloud Security"

    sentry_dsn = "https://f41ad3e714e948457c3757e24b10adf6@o4512105675882496.ingest.de.sentry.io/4512105762324560"
    onesignal_app_id = "your-onesignal-app-id-here"
    onesignal_rest_key = encrypt_secret("your-onesignal-rest-api-key-here")

    ai_gateway_url = "https://ai.ozikol.cloud"
    html_extractor_url = "https://ai.ozikol.cloud"

    cloudinary_cloud = "pcbhnjad"
    cloudinary_key = "159842435718116"
    cloudinary_secret = encrypt_secret("EBGZQvy53v8GY0H-Oo1SpB0VKKQ")

    mongo_uri = encrypt_secret("mongodb+srv://ozikolbcc_db_user:VtZ4grpZt08oHbEu@cluster0.9dzxzz3.mongodb.net/?retryWrites=true&w=majority")
    mongo_db = "OzikolLogsDb"
    mongo_coll = "central_system_logs"

    sql = """
    UPDATE [dbo].[MasterPlatformSettings]
    SET 
        [GoogleReCaptchaSiteKey] = ?,
        [GoogleReCaptchaSecretKey] = ?,
        [EmailProvider] = ?,
        [PostmarkServerToken] = ?,
        [PostmarkDefaultFrom] = ?,
        [EmailFromName] = ?,
        [SentryDsn] = ?,
        [OneSignalAppId] = ?,
        [OneSignalRestApiKey] = ?,
        [AiGatewayUrl] = ?,
        [HtmlExtractorApiUrl] = ?,
        [CloudinaryCloudName] = ?,
        [CloudinaryApiKey] = ?,
        [CloudinaryApiSecret] = ?,
        [MongoLogsConnectionString] = ?,
        [MongoLogsDatabaseName] = ?,
        [MongoLogsCollectionName] = ?,
        [UpdatedUtc] = SYSUTCDATETIME()
    WHERE [Id] = 1;
    """

    cursor.execute(sql, (
        recaptcha_site,
        recaptcha_secret,
        email_provider,
        postmark_token,
        postmark_from,
        email_from_name,
        sentry_dsn,
        onesignal_app_id,
        onesignal_rest_key,
        ai_gateway_url,
        html_extractor_url,
        cloudinary_cloud,
        cloudinary_key,
        cloudinary_secret,
        mongo_uri,
        mongo_db,
        mongo_coll
    ))

    conn.commit()
    print("SUCCESS: Updated MasterPlatformSettings record (Id = 1) with encrypted centralized credentials.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "local"
    if target == "local":
        conn_str = "Driver={ODBC Driver 18 for SQL Server};Server=JSS\\SQLEXPRESS;Database=Ozikol_MasterCatalogDb;Trusted_Connection=yes;TrustServerCertificate=yes;"
    elif target == "server_tunnel":
        conn_str = "Driver={ODBC Driver 18 for SQL Server};Server=127.0.0.1,1433;Database=Ozikol_MasterCatalogDb;UID=sa;PWD=OziBcc_Sql_2026_9031e1f64f1a79ca!;TrustServerCertificate=yes;"
    else:
        conn_str = target

    update_platform_settings(conn_str)
