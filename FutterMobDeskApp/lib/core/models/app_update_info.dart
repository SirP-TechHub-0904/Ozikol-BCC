/// Model representing an application update package returned by the Central Release Engine.
class AppUpdateInfo {
  /// True if a newer version or build number is available.
  final bool hasUpdate;

  /// True if the current installed version is below the minimum required version or marked mandatory.
  final bool isMandatory;

  /// Latest available semantic version (e.g. "1.1.0").
  final String latestVersion;

  /// Latest sequential build number (e.g. 26).
  final int latestBuildNumber;

  /// Minimum supported client version required by the API.
  final String minSupportedVersion;

  /// Markdown or bulleted changelog notes detailing what's new.
  final String releaseNotes;

  /// Download URL for the executable setup, APK, or App Store link.
  final String downloadUrl;

  /// Cryptographic SHA-256 hash for verifying installer binary integrity.
  final String sha256Checksum;

  /// Total installer binary size in bytes.
  final int fileSizeBytes;

  /// UTC publication timestamp.
  final DateTime? publishedAtUtc;

  /// Target platform identifier ("windows", "macos", "linux", "android", "ios", "web").
  final String platform;

  /// Target distribution channel ("stable", "beta", "canary").
  final String channel;

  const AppUpdateInfo({
    required this.hasUpdate,
    required this.isMandatory,
    required this.latestVersion,
    required this.latestBuildNumber,
    required this.minSupportedVersion,
    required this.releaseNotes,
    required this.downloadUrl,
    required this.sha256Checksum,
    required this.fileSizeBytes,
    this.publishedAtUtc,
    required this.platform,
    required this.channel,
  });

  /// Factory deserializer converting API JSON response to [AppUpdateInfo].
  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      hasUpdate: json['hasUpdate'] as bool? ?? false,
      isMandatory: json['isMandatory'] as bool? ?? false,
      latestVersion: json['latestVersion'] as String? ?? '1.0.0',
      latestBuildNumber: (json['latestBuildNumber'] as num?)?.toInt() ?? 1,
      minSupportedVersion: json['minSupportedVersion'] as String? ?? '1.0.0',
      releaseNotes: json['releaseNotes'] as String? ?? '',
      downloadUrl: json['downloadUrl'] as String? ?? '',
      sha256Checksum: json['sha256Checksum'] as String? ?? '',
      fileSizeBytes: (json['fileSizeBytes'] as num?)?.toInt() ?? 0,
      publishedAtUtc: json['publishedAtUtc'] != null
          ? DateTime.tryParse(json['publishedAtUtc'].toString())
          : null,
      platform: json['platform'] as String? ?? '',
      channel: json['channel'] as String? ?? 'stable',
    );
  }

  /// Serializer converting [AppUpdateInfo] to a JSON-compatible map.
  Map<String, dynamic> toJson() => {
        'hasUpdate': hasUpdate,
        'isMandatory': isMandatory,
        'latestVersion': latestVersion,
        'latestBuildNumber': latestBuildNumber,
        'minSupportedVersion': minSupportedVersion,
        'releaseNotes': releaseNotes,
        'downloadUrl': downloadUrl,
        'sha256Checksum': sha256Checksum,
        'fileSizeBytes': fileSizeBytes,
        'publishedAtUtc': publishedAtUtc?.toIso8601String(),
        'platform': platform,
        'channel': channel,
      };
}
