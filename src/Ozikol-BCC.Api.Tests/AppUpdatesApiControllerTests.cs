using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.SetupCommands;
using Ozikol_BCC.Application.Queries.SetupQueries;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    /// <summary>
    /// Integration and unit tests for in-app client updates, SemVer comparison, and crash telemetry ingestion.
    /// </summary>
    public class AppUpdatesApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AppUpdatesApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task CheckUpdate_Endpoint_ReturnsOkApiResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/AppUpdates/check-update?platform=windows&version=1.0.0&buildNumber=1");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<AppUpdateCheckResultDto>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.Platform.Should().Be("windows");
        }

        [Fact]
        public async Task SubmitCrashReport_Endpoint_ReturnsOkAcknowledgment()
        {
            // Arrange
            var report = new CrashReportDto
            {
                Platform = "windows",
                AppVersion = "1.0.0",
                BuildNumber = 1,
                ExceptionMessage = "Test unhandled exception",
                StackTrace = "   at TestApp.Run() in Program.cs:line 10",
                ActiveTenantKey = "demo_tenant"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/AppUpdates/crash-report", report);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<bool>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Data.Should().BeTrue();
        }

        [Theory]
        [InlineData("1.1.0", "1.0.0", 1)]
        [InlineData("1.0.1", "1.0.0", 1)]
        [InlineData("2.0.0", "1.9.9", 1)]
        [InlineData("1.0.0", "1.0.0", 0)]
        [InlineData("1.0.0", "1.0.1", -1)]
        [InlineData("1.0.0", "1.1.0", -1)]
        public void CompareSemVer_EvaluatesAccurately(string v1, string v2, int expectedSign)
        {
            var result = CheckAppUpdateQueryHandler.CompareSemVer(v1, v2);
            Math.Sign(result).Should().Be(expectedSign);
        }

        [Theory]
        [InlineData("1.0.0", 25, "1.0.0", 24, 1)]
        [InlineData("1.0.0", 24, "1.0.0", 24, 0)]
        [InlineData("1.0.0", 23, "1.0.0", 24, -1)]
        [InlineData("1.0.1", 1, "1.0.0", 99, 1)]
        public void CompareVersions_WithBuildNumbers_EvaluatesAccurately(string v1, int build1, string v2, int build2, int expectedSign)
        {
            var result = CheckAppUpdateQueryHandler.CompareVersions(v1, build1, v2, build2);
            Math.Sign(result).Should().Be(expectedSign);
        }
    }
}
