using System.Text.Json.Serialization;

namespace Ozikol_BCC.Api.Models
{
    /// <summary>
    /// Non-generic contract implemented by all <see cref="ApiResponse{T}"/> envelopes so that
    /// error-tracking filters and middleware can inspect and sanitize error payloads uniformly.
    /// </summary>
    public interface IApiErrorEnvelope
    {
        /// <summary>
        /// Gets or sets a value indicating whether the request executed successfully.
        /// </summary>
        bool IsSuccess { get; set; }

        /// <summary>
        /// Gets or sets the standardized error code (e.g., "ERR-3001") when <see cref="IsSuccess"/> is false.
        /// </summary>
        string? ErrorCode { get; set; }

        /// <summary>
        /// Gets or sets the clean, user-friendly Custom Error message returned to the client.
        /// </summary>
        string Message { get; set; }

        /// <summary>
        /// Gets or sets the internal Real Error message captured strictly for Central telemetry and never serialized to clients.
        /// </summary>
        string? RealError { get; set; }

        /// <summary>
        /// Gets or sets the correlation trace identifier for support lookup.
        /// </summary>
        string? TraceId { get; set; }

        /// <summary>
        /// Gets or sets the list of sanitized error messages.
        /// </summary>
        List<string>? Errors { get; set; }
    }

    /// <summary>
    /// Universal standardized API response wrapper model.
    /// </summary>
    /// <typeparam name="T">Payload data type.</typeparam>
    public class ApiResponse<T> : IApiErrorEnvelope
    {
        /// <summary>
        /// Indicates if the request executed successfully.
        /// </summary>
        public bool IsSuccess { get; set; }

        /// <summary>
        /// Standardized catalog error code (e.g., "ERR-3001") populated whenever <see cref="IsSuccess"/> is false.
        /// </summary>
        public string? ErrorCode { get; set; }

        /// <summary>
        /// Human-readable summary message (Custom Error when <see cref="IsSuccess"/> is false).
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Internal raw / real error detail captured strictly for Central administration logs.
        /// Never serialized in client JSON responses.
        /// </summary>
        [JsonIgnore]
        public string? RealError { get; set; }

        /// <summary>
        /// Correlation trace ID for matching client error reports with Central logs.
        /// </summary>
        public string? TraceId { get; set; }

        /// <summary>
        /// Returned payload data object.
        /// </summary>
        public T? Data { get; set; }

        /// <summary>
        /// List of sanitized error messages if operation failed.
        /// </summary>
        public List<string>? Errors { get; set; }

        /// <summary>
        /// UTC timestamp of response.
        /// </summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Creates a successful <see cref="ApiResponse{T}"/> wrapper.
        /// </summary>
        /// <param name="data">The response payload.</param>
        /// <param name="message">Optional success message.</param>
        /// <returns>A populated <see cref="ApiResponse{T}"/> instance.</returns>
        public static ApiResponse<T> SuccessResponse(T data, string message = "Operation completed successfully.")
        {
            return new ApiResponse<T>
            {
                IsSuccess = true,
                ErrorCode = null,
                Message = message,
                Data = data,
                Errors = null,
                Timestamp = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Creates a failed <see cref="ApiResponse{T}"/> wrapper with optional standardized error code and internal real error.
        /// </summary>
        /// <param name="message">The custom error message.</param>
        /// <param name="errors">Optional error list.</param>
        /// <param name="errorCode">Optional standard error code (e.g., "ERR-3001").</param>
        /// <param name="realError">Optional underlying real error for Central logging only.</param>
        /// <returns>A populated failure <see cref="ApiResponse{T}"/> instance.</returns>
        public static ApiResponse<T> FailureResponse(
            string message,
            List<string>? errors = null,
            string? errorCode = null,
            string? realError = null)
        {
            return new ApiResponse<T>
            {
                IsSuccess = false,
                ErrorCode = errorCode,
                Message = message,
                RealError = realError ?? (errors != null && errors.Count > 0 ? string.Join(" | ", errors) : message),
                Data = default,
                Errors = errors ?? new List<string> { message },
                Timestamp = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Creates a failed <see cref="ApiResponse{T}"/> wrapper carrying a data payload.
        /// </summary>
        /// <param name="message">The custom error message.</param>
        /// <param name="data">Optional response data payload.</param>
        /// <param name="errors">Optional error list.</param>
        /// <param name="errorCode">Optional standard error code (e.g., "ERR-3001").</param>
        /// <param name="realError">Optional underlying real error for Central logging only.</param>
        /// <returns>A populated failure <see cref="ApiResponse{T}"/> instance.</returns>
        public static ApiResponse<T> FailureResponse(
            string message,
            T? data,
            List<string>? errors = null,
            string? errorCode = null,
            string? realError = null)
        {
            return new ApiResponse<T>
            {
                IsSuccess = false,
                ErrorCode = errorCode,
                Message = message,
                RealError = realError ?? (errors != null && errors.Count > 0 ? string.Join(" | ", errors) : message),
                Data = data,
                Errors = errors ?? new List<string> { message },
                Timestamp = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Standardized non-generic API response wrapper model.
    /// </summary>
    public class ApiResponse : ApiResponse<object>
    {
        /// <summary>
        /// Creates a successful non-generic <see cref="ApiResponse"/>.
        /// </summary>
        /// <param name="message">Optional success message.</param>
        /// <returns>A populated <see cref="ApiResponse"/> instance.</returns>
        public static ApiResponse SuccessResponse(string message = "Operation completed successfully.")
        {
            return new ApiResponse
            {
                IsSuccess = true,
                ErrorCode = null,
                Message = message,
                Data = null,
                Errors = null,
                Timestamp = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Creates a failed non-generic <see cref="ApiResponse"/> with optional standardized error code and internal real error.
        /// </summary>
        /// <param name="message">The custom error message.</param>
        /// <param name="errors">Optional error list.</param>
        /// <param name="errorCode">Optional standard error code (e.g., "ERR-3001").</param>
        /// <param name="realError">Optional underlying real error for Central logging only.</param>
        /// <returns>A populated failure <see cref="ApiResponse"/> instance.</returns>
        public static new ApiResponse FailureResponse(
            string message,
            List<string>? errors = null,
            string? errorCode = null,
            string? realError = null)
        {
            return new ApiResponse
            {
                IsSuccess = false,
                ErrorCode = errorCode,
                Message = message,
                RealError = realError ?? (errors != null && errors.Count > 0 ? string.Join(" | ", errors) : message),
                Data = null,
                Errors = errors ?? new List<string> { message },
                Timestamp = DateTime.UtcNow
            };
        }
    }
}
