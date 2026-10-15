/// Represents dynamic third-party integration keys and platform operational parameters
/// fetched dynamically from the Central Master Catalog Database on startup.
class ClientAppConfig {
  final String platformName;
  final String? oneSignalAppId;
  final String? sentryDsn;
  final String? cloudflareTurnstileSiteKey;
  final bool isMaintenanceMode;
  final String? maintenanceMessage;
  final String minimumAppVersion;

  const ClientAppConfig({
    this.platformName = 'Ozikol',
    this.oneSignalAppId,
    this.sentryDsn,
    this.cloudflareTurnstileSiteKey,
    this.isMaintenanceMode = false,
    this.maintenanceMessage,
    this.minimumAppVersion = '1.0.0',
  });

  Map<String, dynamic> toJson() {
    return {
      'platformName': platformName,
      'oneSignalAppId': oneSignalAppId,
      'sentryDsn': sentryDsn,
      'cloudflareTurnstileSiteKey': cloudflareTurnstileSiteKey,
      'isMaintenanceMode': isMaintenanceMode,
      'maintenanceMessage': maintenanceMessage,
      'minimumAppVersion': minimumAppVersion,
    };
  }

  factory ClientAppConfig.fromJson(Map<String, dynamic> json) {
    return ClientAppConfig(
      platformName: json['platformName'] as String? ?? 'Ozikol',
      oneSignalAppId: json['oneSignalAppId'] as String?,
      sentryDsn: json['sentryDsn'] as String?,
      cloudflareTurnstileSiteKey: json['cloudflareTurnstileSiteKey'] as String?,
      isMaintenanceMode: json['isMaintenanceMode'] as bool? ?? false,
      maintenanceMessage: json['maintenanceMessage'] as String?,
      minimumAppVersion: json['minimumAppVersion'] as String? ?? '1.0.0',
    );
  }
}
