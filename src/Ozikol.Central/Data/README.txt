MaxMind GeoLite2 Offline Database Directory
==============================================
Place the free `GeoLite2-Country.mmdb` binary database file in this folder:
src/Ozikol.Central/Data/GeoLite2-Country.mmdb

Download:
You can download the free GeoLite2-Country database from MaxMind:
https://dev.maxmind.com/geoip/geolite2-free-geolocation-data

Ozikol GeoLocationService will automatically detect and load this file on startup.
If absent, the system gracefully falls back to Cloudflare edge headers (`CF-IPCountry`),
client browser locale, or the global default currency.
