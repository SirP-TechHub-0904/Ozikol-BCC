using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models.Settings;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.AiServices.Services
{
    public class AiSmartAssistService : IAiSmartAssistService
    {
        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext _dbContext;
        private readonly IConfiguration _configuration;

        public AiSmartAssistService(HttpClient httpClient, DashboardDbContext dbContext, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _dbContext = dbContext;
            _configuration = configuration;
        }

        public async Task<AiCompletionResult> GenerateCompletionAsync(AiCompletionRequest request, CancellationToken cancellationToken = default)
        {
            var securitySetting = await _dbContext.Set<BcpTenantSecuritySetting>().FirstOrDefaultAsync(cancellationToken);
            var activeProvider = request.ProviderOverride ?? securitySetting?.ActiveAiProvider.ToString() ?? "OpenAI";
            var apiKey = securitySetting?.OpenAIApiKey ?? securitySetting?.GeminiApiKey ?? _configuration["Ai:ApiKey"] ?? string.Empty;

            if (activeProvider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase))
            {
                return await CallOpenAiCompatibleApiAsync("https://api.deepseek.com/chat/completions", apiKey, "deepseek-chat", request, cancellationToken);
            }
            if (activeProvider.Equals("Qwen", StringComparison.OrdinalIgnoreCase))
            {
                return await CallOpenAiCompatibleApiAsync("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", apiKey, "qwen-max", request, cancellationToken);
            }
            if (activeProvider.Equals("Kimi", StringComparison.OrdinalIgnoreCase))
            {
                return await CallOpenAiCompatibleApiAsync("https://api.moonshot.cn/v1/chat/completions", apiKey, "moonshot-v1-8k", request, cancellationToken);
            }

            // Default OpenAI / Compatible completion
            return await CallOpenAiCompatibleApiAsync("https://api.openai.com/v1/chat/completions", apiKey, "gpt-4o-mini", request, cancellationToken);
        }

        public async Task<string> SummarizeChatHistoryAsync(List<string> messageList, CancellationToken cancellationToken = default)
        {
            if (messageList == null || messageList.Count == 0) return "No messages to summarize.";

            var concatenated = string.Join("\n", messageList);
            var req = new AiCompletionRequest
            {
                SystemInstruction = "Summarize the following group chat conversation into key discussion points and action items concisely.",
                Prompt = concatenated
            };

            var res = await GenerateCompletionAsync(req, cancellationToken);
            return res.IsSuccess ? res.Content : "Failed to generate summary.";
        }

        private async Task<AiCompletionResult> CallOpenAiCompatibleApiAsync(string endpoint, string apiKey, string model, AiCompletionRequest request, CancellationToken cancellationToken)
        {
            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
                httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");

                var payload = new
                {
                    model = model,
                    messages = new[]
                    {
                        new { role = "system", content = request.SystemInstruction },
                        new { role = "user", content = request.Prompt }
                    },
                    temperature = request.Temperature,
                    max_tokens = request.MaxTokens
                };

                httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    return new AiCompletionResult
                    {
                        IsSuccess = false,
                        ErrorMessage = $"AI Provider returned HTTP {response.StatusCode}"
                    };
                }

                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;

                return new AiCompletionResult
                {
                    IsSuccess = true,
                    Content = content,
                    ProviderUsed = model
                };
            }
            catch (Exception ex)
            {
                return new AiCompletionResult
                {
                    IsSuccess = false,
                    ErrorMessage = $"AI Completion error: {ex.Message}"
                };
            }
        }
    }
}
