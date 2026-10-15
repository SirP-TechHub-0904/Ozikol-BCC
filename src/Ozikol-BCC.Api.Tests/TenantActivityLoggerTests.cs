using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Ozikol_BCC.Application.Services.Logging;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Xunit;

namespace Ozikol_BCC.Api.Tests;

public class TenantActivityLoggerTests
{
    private static DashboardDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<DashboardDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockTenantProvider = new Mock<ITenantProvider>();
        mockTenantProvider.Setup(t => t.ConnectionString).Returns("Server=mock;Database=mock;");

        return new DashboardDbContext(options, mockTenantProvider.Object);
    }

    [Fact]
    public async Task LogAsync_SuccessfullyPersistsActivityLogToDashboardDbContext()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();

        var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        var httpContext = new DefaultHttpContext();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "profile-admin-123"),
            new(ClaimTypes.Name, "Admin Officer")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        httpContext.User = new ClaimsPrincipal(identity);
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("10.0.0.42");
        mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(httpContext);

        var mockLogger = new Mock<ILogger<TenantActivityLogger>>();
        var activityLogger = new TenantActivityLogger(dbContext, mockHttpContextAccessor.Object, mockLogger.Object);

        // Act
        await activityLogger.LogAsync(
            actionType: "ROLE_ASSIGNED",
            description: "Assigned Finance Manager role to Jane Doe",
            module: "UserManagement",
            targetProfileId: "profile-target-456",
            targetFullName: "Jane Doe",
            metadata: new { Role = "FinanceManager", InitiatedFrom = "AdminConsole" });

        // Assert
        var savedLog = await dbContext.BcpActivityLogs.FirstOrDefaultAsync();
        savedLog.Should().NotBeNull();
        savedLog!.ActionType.Should().Be("ROLE_ASSIGNED");
        savedLog.Description.Should().Be("Assigned Finance Manager role to Jane Doe");
        savedLog.Module.Should().Be("UserManagement");
        savedLog.PerformedByProfileId.Should().Be("profile-admin-123");
        savedLog.PerformedByFullName.Should().Be("Admin Officer");
        savedLog.TargetProfileId.Should().Be("profile-target-456");
        savedLog.TargetFullName.Should().Be("Jane Doe");
        savedLog.IpAddress.Should().Be("10.0.0.42");
        savedLog.MetadataJson.Should().Contain("FinanceManager");
    }

    [Fact]
    public async Task LogAsync_WhenExceptionOccurs_CatchesAndLogsWithoutThrowing()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        // Dispose dbContext immediately to cause an ObjectDisposedException upon SaveChanges
        dbContext.Dispose();

        var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        var mockLogger = new Mock<ILogger<TenantActivityLogger>>();
        var activityLogger = new TenantActivityLogger(dbContext, mockHttpContextAccessor.Object, mockLogger.Object);

        // Act
        Func<Task> act = async () => await activityLogger.LogAsync("TEST_ACTION", "Testing failure resilience");

        // Assert
        await act.Should().NotThrowAsync();
    }
}
