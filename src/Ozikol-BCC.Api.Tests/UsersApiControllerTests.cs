using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class UsersApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public UsersApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
            TestJwtHelper.AuthenticateClient(_client);
        }

        [Fact]
        public async Task GetUserCategories_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/UsersApi/categories");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<string[]>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Data.Should().Contain("Regular Member");
        }

        [Fact]
        public async Task CreateUserCategory_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.PostAsJsonAsync("/api/UsersApi/categories", "Honorary Member");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Contain("Category 'Honorary Member' created successfully.");
        }

        [Fact]
        public async Task SendBroadcastNotification_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.PostAsJsonAsync("/api/UsersApi/notifications/broadcast", "Emergency maintenance scheduled for 10 PM.");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Broadcast notification queued successfully.");
        }
    }
}
