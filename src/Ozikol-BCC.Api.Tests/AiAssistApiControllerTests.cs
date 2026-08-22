using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Ozikol_BCC.Api.Models;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    public class AiAssistApiControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AiAssistApiControllerTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
            TestJwtHelper.AuthenticateClient(_client);
        }

        [Fact]
        public async Task SummarizeThread_ReturnsSuccessResponse()
        {
            // Act
            var response = await _client.PostAsJsonAsync("/api/AiAssistApi/summarize-thread", "thread_12345");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<object>>();
            result.Should().NotBeNull();
            result!.IsSuccess.Should().BeTrue();
            result.Message.Should().Be("Thread summarized.");
        }
    }
}
