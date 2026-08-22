using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class GroupsApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public GroupsApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
            TestJwtHelper.AuthenticateClient(_client);
        }

        [Fact]
        public async Task GetGroupCategories_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/GroupsApi/categories");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<string[]>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Data.Should().Contain("Standing Committee");
        }

        [Fact]
        public async Task CreateGroupCategory_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.PostAsJsonAsync("/api/GroupsApi/categories", "Ad-hoc Steering Committee");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Contain("created successfully");
        }

        [Fact]
        public async Task VotePoll_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.PostAsJsonAsync("/api/GroupsApi/polls/vote", new { optionId = Guid.NewGuid() });

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Vote recorded successfully.");
        }
    }
}
