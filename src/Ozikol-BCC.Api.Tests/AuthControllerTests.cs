using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Controllers;
using Ozikol_BCC.Api.Models;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AuthControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Login_WithEmptyCredentials_ReturnsBadRequest()
        {
            // Arrange
            var payload = new AuthController.LoginRequestModel
            {
                Email = "",
                Password = ""
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/login", payload);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeFalse();
            result.Message.Should().Be("Email and Password are required.");
        }

        [Fact]
        public async Task Login_WithNonExistentUser_ReturnsUnauthorized()
        {
            // Arrange
            var payload = new AuthController.LoginRequestModel
            {
                Email = "nonexistent_user_999@domain.com",
                Password = "InvalidPassword123!"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/login", payload);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeFalse();
            result.Message.Should().Contain("Invalid email or password credentials.");
        }
    }
}
