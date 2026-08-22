using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Queries.SetupQueries;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class SetupApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public SetupApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetStatus_ReturnsSuccessApiResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/SetupApi/status");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<SetupStatusDto>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Contain("Tenant setup status retrieved.");
            result.Data.Should().NotBeNull();
        }
    }
}
