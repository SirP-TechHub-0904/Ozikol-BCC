/// Represents an enrolled tenant workspace on the user's mobile or desktop device.
class Workspace {
  final String tenantKey;
  final String organizationName;
  final String primaryDomain;
  final String? customDomain;
  final String? logoUrl;
  final String? iconUrl;
  final String? authToken;
  final String? userId;
  final String? userEmail;
  final String? userFullName;
  final List<String> userRoles;
  final DateTime lastAccessed;
  final bool isActive;

  const Workspace({
    required this.tenantKey,
    required this.organizationName,
    required this.primaryDomain,
    this.customDomain,
    this.logoUrl,
    this.iconUrl,
    this.authToken,
    this.userId,
    this.userEmail,
    this.userFullName,
    this.userRoles = const [],
    required this.lastAccessed,
    this.isActive = true,
  });

  /// Human-friendly display title for the organization
  String get displayName => organizationName.trim().isNotEmpty ? organizationName : tenantKey;

  /// Effective square emblem or avatar icon URL. Prefers iconUrl (favicon / app icon) over horizontal logoUrl.
  String? get avatarUrl => (iconUrl != null && iconUrl!.trim().isNotEmpty) ? iconUrl : logoUrl;

  /// High-contrast monogram letters for initial avatars when logo is absent
  String get initials {
    final clean = displayName.trim();
    if (clean.isEmpty) return 'OZ';
    final parts = clean.split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      final first = parts[0].isNotEmpty ? parts[0][0] : '';
      final second = parts[1].isNotEmpty ? parts[1][0] : '';
      return '$first$second'.toUpperCase();
    }
    return clean.substring(0, clean.length >= 2 ? 2 : clean.length).toUpperCase();
  }

  /// Whether the workspace currently has a valid session token
  bool get isAuthenticated => authToken != null && authToken!.trim().isNotEmpty;

  Workspace copyWith({
    String? tenantKey,
    String? organizationName,
    String? primaryDomain,
    String? customDomain,
    String? logoUrl,
    bool clearLogoUrl = false,
    String? iconUrl,
    bool clearIconUrl = false,
    String? authToken,
    bool clearAuthToken = false,
    String? userId,
    String? userEmail,
    String? userFullName,
    List<String>? userRoles,
    DateTime? lastAccessed,
    bool? isActive,
  }) {
    return Workspace(
      tenantKey: tenantKey ?? this.tenantKey,
      organizationName: organizationName ?? this.organizationName,
      primaryDomain: primaryDomain ?? this.primaryDomain,
      customDomain: customDomain ?? this.customDomain,
      logoUrl: clearLogoUrl ? null : (logoUrl ?? this.logoUrl),
      iconUrl: clearIconUrl ? null : (iconUrl ?? this.iconUrl),
      authToken: clearAuthToken ? null : (authToken ?? this.authToken),
      userId: userId ?? this.userId,
      userEmail: userEmail ?? this.userEmail,
      userFullName: userFullName ?? this.userFullName,
      userRoles: userRoles ?? this.userRoles,
      lastAccessed: lastAccessed ?? this.lastAccessed,
      isActive: isActive ?? this.isActive,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tenantKey': tenantKey,
      'organizationName': organizationName,
      'primaryDomain': primaryDomain,
      'customDomain': customDomain,
      'logoUrl': logoUrl,
      'iconUrl': iconUrl,
      'authToken': authToken,
      'userId': userId,
      'userEmail': userEmail,
      'userFullName': userFullName,
      'userRoles': userRoles,
      'lastAccessed': lastAccessed.toIso8601String(),
      'isActive': isActive,
    };
  }

  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      tenantKey: json['tenantKey'] as String? ?? '',
      organizationName: json['organizationName'] as String? ?? '',
      primaryDomain: json['primaryDomain'] as String? ?? '',
      customDomain: json['customDomain'] as String?,
      logoUrl: json['logoUrl'] as String?,
      iconUrl: json['iconUrl'] as String?,
      authToken: json['authToken'] as String?,
      userId: json['userId'] as String?,
      userEmail: json['userEmail'] as String?,
      userFullName: json['userFullName'] as String?,
      userRoles: (json['userRoles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      lastAccessed: json['lastAccessed'] != null
          ? DateTime.tryParse(json['lastAccessed'] as String) ?? DateTime.now()
          : DateTime.now(),
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}
