using System;
using System.Text;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Verifies whether downloaded or uploaded binary payloads represent authentic, sanitized image formats
/// (PNG, JPEG, WebP, GIF, BMP, ICO, and safe SVG) rather than disguised executables, shell scripts, or HTML polyglots.
/// </summary>
public static class ImageMagicBytesValidator
{
    private static readonly byte[] PngHeader = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
    private static readonly byte[] JpegHeader = new byte[] { 0xFF, 0xD8, 0xFF };
    private static readonly byte[] Gif87Header = Encoding.ASCII.GetBytes("GIF87a");
    private static readonly byte[] Gif89Header = Encoding.ASCII.GetBytes("GIF89a");
    private static readonly byte[] BmpHeader = new byte[] { 0x42, 0x4D }; // "BM"
    private static readonly byte[] IcoHeader = new byte[] { 0x00, 0x00, 0x01, 0x00 };

    /// <summary>
    /// Audits the header bytes of a binary payload to verify it represents a recognized, authentic image format.
    /// </summary>
    /// <param name="bytes">Raw binary payload to inspect.</param>
    /// <param name="detectedMime">Output MIME type if recognized.</param>
    /// <returns>True if the payload matches legitimate image signatures; otherwise, false.</returns>
    public static bool IsValidImage(byte[]? bytes, out string detectedMime)
    {
        detectedMime = "application/octet-stream";
        if (bytes == null || bytes.Length < 4)
        {
            return false;
        }

        // 1. Inspect PNG signature (8 bytes)
        if (bytes.Length >= 8 && MatchesHeader(bytes, PngHeader))
        {
            detectedMime = "image/png";
            return true;
        }

        // 2. Inspect JPEG signature (3 bytes)
        if (MatchesHeader(bytes, JpegHeader))
        {
            detectedMime = "image/jpeg";
            return true;
        }

        // 3. Inspect WebP signature (RIFF....WEBP)
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 && // "RIFF"
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) // "WEBP"
        {
            detectedMime = "image/webp";
            return true;
        }

        // 4. Inspect GIF signature (6 bytes)
        if (bytes.Length >= 6 && (MatchesHeader(bytes, Gif87Header) || MatchesHeader(bytes, Gif89Header)))
        {
            detectedMime = "image/gif";
            return true;
        }

        // 5. Inspect BMP signature (2 bytes)
        if (MatchesHeader(bytes, BmpHeader))
        {
            detectedMime = "image/bmp";
            return true;
        }

        // 6. Inspect ICO signature (4 bytes)
        if (MatchesHeader(bytes, IcoHeader))
        {
            detectedMime = "image/x-icon";
            return true;
        }

        // 7. Inspect SVG (Text-based XML vector image)
        if (IsSafeSvg(bytes))
        {
            detectedMime = "image/svg+xml";
            return true;
        }

        return false;
    }

    private static bool MatchesHeader(byte[] bytes, byte[] header)
    {
        if (bytes.Length < header.Length) return false;
        for (int i = 0; i < header.Length; i++)
        {
            if (bytes[i] != header[i]) return false;
        }
        return true;
    }

    private static bool IsSafeSvg(byte[] bytes)
    {
        if (bytes.Length < 10) return false;

        try
        {
            // Inspect first 2048 bytes for SVG signatures
            int scanLength = Math.Min(bytes.Length, 2048);
            string snippet = Encoding.UTF8.GetString(bytes, 0, scanLength).TrimStart();

            // Must start with <svg or <?xml followed by <svg
            bool isSvg = snippet.StartsWith("<svg", StringComparison.OrdinalIgnoreCase) ||
                         (snippet.StartsWith("<?xml", StringComparison.OrdinalIgnoreCase) &&
                          snippet.Contains("<svg", StringComparison.OrdinalIgnoreCase));

            if (!isSvg) return false;

            // Audit whole file for executable script tags or javascript pseudo-protocols
            string fullText = Encoding.UTF8.GetString(bytes);
            if (fullText.Contains("<script", StringComparison.OrdinalIgnoreCase) ||
                fullText.Contains("javascript:", StringComparison.OrdinalIgnoreCase) ||
                fullText.Contains("onload=", StringComparison.OrdinalIgnoreCase) ||
                fullText.Contains("onerror=", StringComparison.OrdinalIgnoreCase))
            {
                // Dangerous SVG polyglot with embedded JavaScript execution
                return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
