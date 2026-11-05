using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Ozikol_BCC.Application.Commands.SetupCommands;
using Ozikol_BCC.Application.Models.Logging;
using Ozikol_BCC.Application.Services.Logging;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    /// <summary>
    /// Unit tests verifying Central MongoDB log collection, fallback handling, and telemetry formatting.
    /// </summary>
    public class CentralLogCollectorTests
    {
        private readonly Mock<ILogger<CentralLogCollector>> _loggerMock;
        private readonly Mock<IConfiguration> _configMock;
        private readonly IServiceProvider _serviceProvider;

        public CentralLogCollectorTests()
        {
            _loggerMock = new Mock<ILogger<CentralLogCollector>>();
            _configMock = new Mock<IConfiguration>();

            var services = new ServiceCollection();
            _serviceProvider = services.BuildServiceProvider();
        }

        [Fact]
        public async Task LogSystemExceptionAsync_WhenMongoUnconfigured_FallsBackToLoggerWithoutThrowing()
        {
            // Arrange
            var collector = new CentralLogCollector(_serviceProvider, _configMock.Object, _loggerMock.Object);
            var exception = new InvalidOperationException("Test API exception");

            // Act
            Func<Task> act = async () => await collector.LogSystemExceptionAsync(
                exception,
                "/api/test",
                "GET",
                "test-tenant",
                "trace-12345");

            // Assert
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task LogClientCrashAsync_WhenMongoUnconfigured_FallsBackToLoggerWithoutThrowing()
        {
            // Arrange
            var collector = new CentralLogCollector(_serviceProvider, _configMock.Object, _loggerMock.Object);
            var report = new CrashReportDto
            {
                Platform = "android",
                AppVersion = "1.0.0",
                BuildNumber = 12,
                ExceptionMessage = "Fatal Android exception",
                StackTrace = "at AndroidApp.Run()",
                ActiveTenantKey = "mobile_org",
                DiagnosticMetadata = "[11:00:00] [INFO] [Auth] Login successful"
            };

            // Act
            Func<Task> act = async () => await collector.LogClientCrashAsync(report);

            // Assert
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task LogSecurityAlertAsync_ConstructsDocumentAndExecutesSafely()
        {
            // Arrange
            var collector = new CentralLogCollector(_serviceProvider, _configMock.Object, _loggerMock.Object);

            // Act
            Func<Task> act = async () => await collector.LogSecurityAlertAsync(
                "TurnstileBotBlocked",
                "Suspicious bot activity detected",
                "tenant_omega",
                "192.168.1.1",
                new Dictionary<string, object?> { { "score", 0.1 } });

            // Assert
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public void CentralLogDocument_Defaults_AreProperlyInitialized()
        {
            // Arrange & Act
            var doc = new CentralLogDocument
            {
                Message = "Test initialization"
            };

            // Assert
            doc.TimestampUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
            doc.Level.Should().Be("Information");
            doc.Category.Should().Be("SystemCrash");
            doc.Application.Should().Be("Ozikol-BCC.Api");
            doc.Message.Should().Be("Test initialization");
        }
    }
}
