using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Queries.SettingsQueries;
using Ozikol_BCC.Domain.Models.Settings;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class SettingsApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public SettingsApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTerminologyAliases_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/SettingsApi/aliases");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<TerminologyAliasesDto>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Terminology aliases retrieved.");
            result.Data.Should().NotBeNull();
        }

        [Fact]
        public async Task GetBrandSettings_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/SettingsApi/brand");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<BcpTenantBrandSetting>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Brand identity settings retrieved.");
        }

        [Fact]
        public async Task GetFeatureFlags_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/SettingsApi/features");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Feature flags retrieved.");
        }
    }
}
