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
  final Map<String, dynamic> effectivePermissions;
  final List<String> licensedFeatures;
  final String activeConsoleMode;
  final DateTime lastAccessed;
  final bool isActive;
  final String? groupAlias;
  final String? alumniAlias;
  final String? categoryAlias;

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
    this.effectivePermissions = const {},
    this.licensedFeatures = const [],
    this.activeConsoleMode = 'administration',
    required this.lastAccessed,
    this.isActive = true,
    this.groupAlias,
    this.alumniAlias,
    this.categoryAlias,
  });

  /// Effective label alias for Groups & Committees (defaults to 'Groups & Committees')
  String get effectiveGroupAlias {
    if (groupAlias != null && groupAlias!.trim().isNotEmpty) {
      return groupAlias!.trim();
    }
    final pAlias = effectivePermissions['groupAlias'] as String?;
    if (pAlias != null && pAlias.trim().isNotEmpty) {
      return pAlias.trim();
    }
    return 'Groups & Committees';
  }

  /// Effective label alias for Alumni Network (defaults to 'Alumni Network')
  String get effectiveAlumniAlias {
    if (alumniAlias != null && alumniAlias!.trim().isNotEmpty) {
      return alumniAlias!.trim();
    }
    final pAlias = effectivePermissions['alumniAlias'] as String?;
    if (pAlias != null && pAlias.trim().isNotEmpty) {
      return pAlias.trim();
    }
    return 'Alumni Network';
  }

  /// Effective label alias for User Categories (defaults to 'User Categories')
  String get effectiveCategoryAlias {
    if (categoryAlias != null && categoryAlias!.trim().isNotEmpty) {
      return categoryAlias!.trim();
    }
    final pAlias = effectivePermissions['categoryAlias'] as String?;
    if (pAlias != null && pAlias.trim().isNotEmpty) {
      return pAlias.trim();
    }
    return 'User Categories';
  }

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

  /// Whether the current authenticated user holds the SuperAdmin role
  bool get isSuperAdmin =>
      userRoles.any((r) => r.toLowerCase() == 'superadmin') ||
      (effectivePermissions['isSuperAdmin'] == true);

  /// Whether the current authenticated user holds Admin or SuperAdmin role
  bool get isAdmin =>
      isSuperAdmin ||
      userRoles.any((r) => r.toLowerCase() == 'admin') ||
      (effectivePermissions['isAdmin'] == true);

  /// Whether the user has global editing mutation rights across all features
  bool get hasGlobalEdit =>
      isSuperAdmin ||
      isAdmin ||
      (effectivePermissions['hasGlobalEdit'] == true) ||
      userRoles.any((r) => r.toLowerCase() == 'globaledit');

  /// Whether the user holds any administrative or feature-scoped role that permits access to the Administration Console
  bool get canAccessAdminConsole =>
      isAdmin ||
      isSuperAdmin ||
      hasGlobalEdit ||
      (effectivePermissions['canAccessAdminConsole'] == true) ||
      (effectivePermissions['features'] is Map &&
          (effectivePermissions['features'] as Map).isNotEmpty) ||
      userRoles.any((r) => [
            'usermanager',
            'identitymanager',
            'cmsmanager',
            'editor',
            'featureedit',
            'systemadministrator'
          ].contains(r.toLowerCase()));

  /// Verifies if a modular capability is active and licensed for this tenant organization
  bool isFeatureActive(String code) {
    if (code.trim().isEmpty) return false;
    final target = code.trim().toLowerCase();
    return licensedFeatures.any((f) => f.trim().toLowerCase() == target);
  }

  /// Checks if the user has mutation/editing permission for a given feature code
  bool canEditFeature(String code) {
    if (isSuperAdmin || isAdmin || hasGlobalEdit) return true;
    final feats = effectivePermissions['features'];
    if (feats is Map) {
      final level = feats[code]?.toString();
      if (level != null && level.toLowerCase() == 'featureedit') return true;
    }
    return false;
  }

  /// Checks if the user is in view-only / ReadOnly mode for a given feature code
  bool isFeatureReadOnly(String code) {
    if (isSuperAdmin || isAdmin || hasGlobalEdit) return false;
    final feats = effectivePermissions['features'];
    if (feats is Map) {
      final level = feats[code]?.toString();
      if (level != null && level.toLowerCase() == 'readonly') return true;
    }
    return false;
  }

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
    Map<String, dynamic>? effectivePermissions,
    List<String>? licensedFeatures,
    String? activeConsoleMode,
    DateTime? lastAccessed,
    bool? isActive,
    String? groupAlias,
    String? alumniAlias,
    String? categoryAlias,
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
      effectivePermissions: effectivePermissions ?? this.effectivePermissions,
      licensedFeatures: licensedFeatures ?? this.licensedFeatures,
      activeConsoleMode: activeConsoleMode ?? this.activeConsoleMode,
      lastAccessed: lastAccessed ?? this.lastAccessed,
      isActive: isActive ?? this.isActive,
      groupAlias: groupAlias ?? this.groupAlias,
      alumniAlias: alumniAlias ?? this.alumniAlias,
      categoryAlias: categoryAlias ?? this.categoryAlias,
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
      'effectivePermissions': effectivePermissions,
      'licensedFeatures': licensedFeatures,
      'activeConsoleMode': activeConsoleMode,
      'lastAccessed': lastAccessed.toIso8601String(),
      'isActive': isActive,
      'groupAlias': groupAlias,
      'alumniAlias': alumniAlias,
      'categoryAlias': categoryAlias,
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
      effectivePermissions: json['effectivePermissions'] as Map<String, dynamic>? ?? const {},
      licensedFeatures: (json['licensedFeatures'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      activeConsoleMode: json['activeConsoleMode'] as String? ?? 'administration',
      lastAccessed: json['lastAccessed'] != null
          ? DateTime.tryParse(json['lastAccessed'] as String) ?? DateTime.now()
          : DateTime.now(),
      isActive: json['isActive'] as bool? ?? true,
      groupAlias: json['groupAlias'] as String?,
      alumniAlias: json['alumniAlias'] as String?,
      categoryAlias: json['categoryAlias'] as String?,
    );
  }
}
