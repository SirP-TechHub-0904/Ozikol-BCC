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
        ApiConstants.verifyLoginMfaEndpoint,
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
        Map<String, dynamic>? resultMap;
        if (data is Map && data['data'] is Map) {
          resultMap = Map<String, dynamic>.from(data['data'] as Map);
        } else if (data is Map) {
          resultMap = Map<String, dynamic>.from(data);
        }

        if (resultMap != null) {
          // Extract trust token from body or response header if provided by backend
          final headerToken = response.headers.value('x-device-trust-token');
          if (headerToken != null && headerToken.isNotEmpty && resultMap['trustToken'] == null) {
            resultMap['trustToken'] = headerToken;
          }
          return resultMap;
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
      throw Exception(msg ?? (e.response != null ? 'Unable to sign in right now. Please try again.' : 'Unable to connect. Please check your network connection.'));
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
        ApiConstants.resendLoginMfaEndpoint,
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
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to resend code right now. Please try again.';
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
        ApiConstants.forgotPasswordEndpoint,
        data: {'email': email.trim()},
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        return (data is Map ? data['message'] : null) ?? 'Password reset instructions dispatched.';
      }
      return 'If an account exists, a reset code has been sent.';
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final data = e.response?.data;
      String? msg;
      if (data is Map) {
        msg = data['message']?.toString() ??
            data['Message']?.toString() ??
            data['error']?.toString();
      }
      throw Exception(msg ?? 'Unable to send reset instructions right now. Please try again.');
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
        ApiConstants.resetPasswordEndpoint,
        data: {
          'email': email.trim(),
          'otp': token.trim(),
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
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to reset password. Please check the code and try again.';
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
        ApiConstants.forceChangePasswordEndpoint,
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode != 200) {
        throw Exception('Unable to update password. Please try again.');
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to update password. Please ensure it meets security requirements.';
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
        ApiConstants.changePasswordEndpoint,
        data: {
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode != 200) {
        throw Exception('Unable to change password. Please try again.');
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to change password. Please check your current password.';
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
        ApiConstants.mfaStatusEndpoint,
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
        ApiConstants.mfaConfigureEndpoint,
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
      throw Exception('Unable to set up verification right now. Please try again.');
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Unable to configure verification provider right now.';
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
        ApiConstants.mfaVerifyEndpoint,
        data: {
          'provider': provider,
          'code': code.trim(),
        },
        options: Options(headers: {ApiConstants.headerTenantKey: tenantKey}),
      );

      if (response.statusCode != 200) {
        throw Exception('Unable to verify code. Please try again.');
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        throw Exception('Unable to connect. Please check your network connection.');
      }
      final msg = e.response?.data is Map && e.response?.data['message'] != null
          ? e.response?.data['message'].toString()
          : 'Invalid verification code. Please check your code and try again.';
      throw Exception(msg);
    }
  }
}
