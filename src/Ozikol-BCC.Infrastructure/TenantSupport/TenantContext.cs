namespace Ozikol_BCC.Infrastructure.TenantSupport;

/// <summary>
/// Holds tenant identity for the current async execution flow.
/// This keeps tenant selection away from global static state while allowing services
/// lower in the call chain to resolve the correct database connection.
/// </summary>
internal static class TenantContext
{
    private sealed class ContextDisposable : IDisposable
    {
        private bool _disposed;

        public void Dispose()
        {
            if (!_disposed)
            {
                EndScope();
                _disposed = true;
            }
        }
    }

    private static readonly AsyncLocal<TenantContextHolder> TenantHolder = new();

    /// <summary>
    /// Gets current tenant context
    /// </summary>
    public static string? CurrentTenant => TenantHolder.Value?.Tenant;

    public static IDisposable BeginScope(string tenant)
    {
        // Use an object indirection to hold the OperationContext in the AsyncLocal,
        // so it can be cleared in all ExecutionContexts when its cleared.
        TenantHolder.Value = new TenantContextHolder { Tenant = tenant };

        return new ContextDisposable();
    }

    public static void EndScope()
    {
        var holder = TenantHolder.Value;
        if (holder != null)
        {
            // Clear the tenant from the async flow when the scoped operation is complete.
            holder.Tenant = null;
        }
    }

    private class TenantContextHolder
    {
        public string? Tenant { get; set; }
    }
}

