import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../state/workspace_state.dart';

/// Provider exposing the centralized [AuthService] for identity, 2FA, and password operations.
final authServiceProvider = Provider<AuthService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthService(apiClient);
});

/// Central authentication and security lifecycle service.
/// Coordinates two-factor challenge verification, password recovery, temporary password force-changes,
/// and self-service account credential management.
class AuthService {
  final ApiClient _apiClient;

  /// Creates a new instance of [AuthService].
  AuthService(this._apiClient);

  Dio get _dio => _apiClient.dio;

  /// <summary>
  /// Submits a 6-digit TOTP authenticator code or SMS/email OTP to complete a two-factor login challenge.
  /// </summary>
  /// <param name="userId">The unique identifier of the user attempting verification.</param>
  /// <param name="code">The 6-digit verification code entered by the user.</param>
  /// <param name="trustDevice">Whether to record a persistent device trust cookie to bypass future challenges.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A map containing the authenticated JWT token, user claims, and assigned roles.</returns>
  Future<Map<String, dynamic>> verifyLoginMfa({
    required String userId,
    required String code,
    bool trustDevice = false,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/login/verify-mfa',
        data: {
          'userId': userId,
          'code': code.trim(),
          'trustDevice': trustDevice,
          'tenantKey': tenantKey,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['data'] is Map) {
          return Map<String, dynamic>.from(data['data'] as Map);
        } else if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
      }
      throw Exception('Verification failed. Please check the code and try again.');
    } on DioException catch (e) {
      final data = e.response?.data;
      String? msg;
      if (data is Map) {
        msg = data['message']?.toString() ??
            data['Message']?.toString() ??
            data['title']?.toString() ??
            data['Title']?.toString() ??
            data['error']?.toString();

        if (msg == null && data['errors'] != null) {
          if (data['errors'] is List && (data['errors'] as List).isNotEmpty) {
            msg = (data['errors'] as List).first.toString();
          } else if (data['errors'] is Map && (data['errors'] as Map).isNotEmpty) {
            final firstVal = (data['errors'] as Map).values.first;
            if (firstVal is List && firstVal.isNotEmpty) {
              msg = firstVal.first.toString();
            } else {
              msg = firstVal?.toString();
            }
          }
        }
      } else if (data is String && data.isNotEmpty) {
        msg = data;
      }
      throw Exception(msg ?? (e.response != null ? 'Server error (${e.response?.statusCode}): ${e.response?.statusMessage}' : 'Network error: ${e.message}'));
    }
  }

  /// <summary>
  /// Requests a fresh one-time verification code to be dispatched via email or SMS.
  /// </summary>
  /// <param name="userId">The unique identifier of the authenticating user.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A string message indicating success and delivery channel.</returns>
  Future<String> resendLoginMfa({
    required String userId,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/login/resend-mfa',
        data: {
          'userId': userId,
          'tenantKey': tenantKey,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        return (data is Map ? data['message'] : null) ?? 'Verification code resent successfully.';
      }
      return 'Verification code resent.';
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to resend code at this time.';
      throw Exception(msg);
    }
  }

  /// <summary>
  /// Initiates password recovery by requesting a 6-digit OTP reset token via email.
  /// </summary>
  /// <param name="email">The user email address.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A confirmation message.</returns>
  Future<String> requestPasswordResetOtp({
    required String email,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/password/forgot',
        data: {'email': email.trim()},
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        return (data is Map ? data['message'] : null) ?? 'Password reset instructions dispatched.';
      }
      return 'If an account exists, a reset code has been sent.';
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to dispatch reset instructions.';
      throw Exception(msg);
    }
  }

  /// <summary>
  /// Finalizes password reset using the token / OTP delivered via email.
  /// </summary>
  /// <param name="email">The account email address.</param>
  /// <param name="token">The reset token or code.</param>
  /// <param name="newPassword">The new password meeting complexity requirements.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A confirmation message upon successful password change.</returns>
  Future<String> resetPasswordWithToken({
    required String email,
    required String token,
    required String newPassword,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/password/reset',
        data: {
          'email': email.trim(),
          'token': token.trim(),
          'newPassword': newPassword,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        return (data is Map ? data['message'] : null) ?? 'Password reset successfully.';
      }
      return 'Password updated.';
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Failed to reset password. Please check the code.';
      throw Exception(msg);
    }
  }

  /// <summary>
  /// Forces a mandatory password change on first login when flagged with MustChangePassword.
  /// </summary>
  /// <param name="oldPassword">The temporary password provided during account creation.</param>
  /// <param name="newPassword">The new custom password chosen by the user.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A future that completes when the temporary password has been successfully replaced.</returns>
  Future<void> forceChangePassword({
    String? oldPassword,
    required String newPassword,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/password/force-change',
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update password.');
      }
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to update password. Please ensure it meets complexity standards.';
      throw Exception(msg);
    }
  }

  /// <summary>
  /// Self-service password change from authenticated settings or Manage My Account.
  /// </summary>
  /// <param name="oldPassword">The current active password.</param>
  /// <param name="newPassword">The newly desired password.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A future representing the update operation.</returns>
  Future<void> changePassword({
    required String oldPassword,
    required String newPassword,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/password/change',
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to change password.');
      }
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to change password. Please verify current credentials.';
      throw Exception(msg);
    }
  }

  /// <summary>
  /// Retrieves the current user's two-factor authentication configuration status.
  /// </summary>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A map describing whether 2FA is active and the preferred provider.</returns>
  Future<Map<String, dynamic>> getMfaStatus({required String tenantKey}) async {
    try {
      final response = await _dio.get(
        'api/Auth/mfa',
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['data'] is Map) {
          return Map<String, dynamic>.from(data['data'] as Map);
        } else if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
      }
      return {'mfaEnabled': false, 'provider': 'None'};
    } catch (_) {
      return {'mfaEnabled': false, 'provider': 'None'};
    }
  }

  /// <summary>
  /// Initiates enrollment in an authenticator provider (e.g. Google Authenticator / Microsoft Authenticator),
  /// returning the secret key and QR code setup URI.
  /// </summary>
  /// <param name="provider">The desired provider ('GoogleAuthenticator', 'MicrosoftAuthenticator', 'Email').</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A map containing the shared secret and setup URI.</returns>
  Future<Map<String, dynamic>> configureMfa({
    required String provider,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/mfa/configure',
        data: {'provider': provider},
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['data'] is Map) {
          return Map<String, dynamic>.from(data['data'] as Map);
        } else if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
      }
      throw Exception('Failed to initialize 2FA enrollment.');
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to configure 2FA provider.';
      throw Exception(msg);
    }
  }

  /// <summary>
  /// Verifies a 6-digit confirmation code from the authenticator app to finalize 2FA activation.
  /// </summary>
  /// <param name="provider">The provider being activated.</param>
  /// <param name="code">The 6-digit verification code.</param>
  /// <param name="tenantKey">The tenant workspace context key.</param>
  /// <returns>A future that completes when 2FA is officially enabled.</returns>
  Future<void> verifyMfaActivation({
    required String provider,
    required String code,
    required String tenantKey,
  }) async {
    try {
      final response = await _dio.post(
        'api/Auth/mfa/verify',
        data: {
          'provider': provider,
          'code': code.trim(),
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to verify 2FA code.');
      }
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Invalid 2FA verification code.';
      throw Exception(msg);
    }
  }
}
