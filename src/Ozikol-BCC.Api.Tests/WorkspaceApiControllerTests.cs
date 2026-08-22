using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class WorkspaceApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public WorkspaceApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
            TestJwtHelper.AuthenticateClient(_client);
        }

        [Fact]
        public async Task GetWorkspaceDashboard_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/WorkspaceApi/dashboard");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Workspace dashboard data retrieved.");
        }

        [Fact]
        public async Task GetNotifications_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/WorkspaceApi/notifications");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Notification feed retrieved.");
        }
    }
}
