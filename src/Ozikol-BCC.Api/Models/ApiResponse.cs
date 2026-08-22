namespace Ozikol_BCC.Api.Models
{
    /// <summary>
    /// Universal standardized API response wrapper model.
    /// </summary>
    /// <typeparam name="T">Payload data type.</typeparam>
    public class ApiResponse<T>
    {
        /// <summary>
        /// Indicates if the request executed successfully.
        /// </summary>
        public bool IsSuccess { get; set; }

        /// <summary>
        /// Human-readable summary message.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Returned payload data object.
        /// </summary>
        public T? Data { get; set; }

        /// <summary>
        /// List of error messages if operation failed.
        /// </summary>
        public List<string>? Errors { get; set; }

        /// <summary>
        /// UTC timestamp of response.
        /// </summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public static ApiResponse<T> SuccessResponse(T data, string message = "Operation completed successfully.")
        {
            return new ApiResponse<T>
            {
                IsSuccess = true,
                Message = message,
                Data = data,
                Errors = null,
                Timestamp = DateTime.UtcNow
            };
        }

        public static ApiResponse<T> FailureResponse(string message, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                IsSuccess = false,
                Message = message,
                Data = default,
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
        public static ApiResponse SuccessResponse(string message = "Operation completed successfully.")
        {
            return new ApiResponse
            {
                IsSuccess = true,
                Message = message,
                Data = null,
                Errors = null,
                Timestamp = DateTime.UtcNow
            };
        }

        public static new ApiResponse FailureResponse(string message, List<string>? errors = null)
        {
            return new ApiResponse
            {
                IsSuccess = false,
                Message = message,
                Data = null,
                Errors = errors ?? new List<string> { message },
                Timestamp = DateTime.UtcNow
            };
        }
    }
}
