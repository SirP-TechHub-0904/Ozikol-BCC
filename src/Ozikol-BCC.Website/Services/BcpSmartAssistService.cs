using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Services
{
    public class BcpSmartAssistService : IBcpSmartAssistService
    {
        private readonly DashboardDbContext _context;
        private readonly HttpClient _httpClient;

        public BcpSmartAssistService(DashboardDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
        }

        public async Task<string> GenerateChatResponseAsync(string prompt, string? systemMessage = null)
        {
            var ManagementSetting = await _context.BcpSettings.FirstOrDefaultAsync();
            if (ManagementSetting == null || ManagementSetting.ActiveAiProvider == Domain.Enum.Enum.BcpAiProvider.None)
            {
                return "SmartAssist is currently disabled by the Administrator.";
            }

            try
            {
                if (ManagementSetting.ActiveAiProvider == Domain.Enum.Enum.BcpAiProvider.Gemini && !string.IsNullOrEmpty(ManagementSetting.GeminiApiKey))
                {
                    return await CallGeminiAsync(prompt, systemMessage, ManagementSetting.GeminiApiKey);
                }
                else if (ManagementSetting.ActiveAiProvider == Domain.Enum.Enum.BcpAiProvider.OpenAI && !string.IsNullOrEmpty(ManagementSetting.OpenAIApiKey))
                {
                    return await CallOpenAiAsync(prompt, systemMessage, ManagementSetting.OpenAIApiKey);
                }
                else if (ManagementSetting.ActiveAiProvider == Domain.Enum.Enum.BcpAiProvider.Anthropic && !string.IsNullOrEmpty(ManagementSetting.AnthropicApiKey))
                {
                    return await CallAnthropicAsync(prompt, systemMessage, ManagementSetting.AnthropicApiKey);
                }

                return "The selected AI Provider is active but the API key is missing. Please contact the Administrator.";
            }
            catch (System.Exception ex)
            {
                return $"Error connecting to AI Provider: {ex.Message}";
            }
        }

        private async Task<string> CallGeminiAsync(string prompt, string? systemMessage, string apiKey)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={apiKey}";
            
            // Simple Gemini payload
            var parts = new[] { new { text = (systemMessage != null ? $"{systemMessage}\n\n" : "") + prompt } };
            var payload = new
            {
                contents = new[]
                {
                    new { parts = parts }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var jsonString = await response.Content.ReadAsStringAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(jsonString);
            
            // Extract text from Gemini response structure
            try {
                return json.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
            } catch {
                return "Error parsing Gemini response.";
            }
        }

        private async Task<string> CallOpenAiAsync(string prompt, string? systemMessage, string apiKey)
        {
            var url = "https://api.openai.com/v1/chat/completions";
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var messages = new System.Collections.Generic.List<object>();
            if (!string.IsNullOrEmpty(systemMessage))
            {
                messages.Add(new { role = "system", content = systemMessage });
            }
            messages.Add(new { role = "user", content = prompt });

            var payload = new
            {
                model = "gpt-3.5-turbo",
                messages = messages
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var jsonString = await response.Content.ReadAsStringAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(jsonString);
            
            try {
                return json.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
            } catch {
                return "Error parsing OpenAI response.";
            }
        }

        private async Task<string> CallAnthropicAsync(string prompt, string? systemMessage, string apiKey)
        {
            var url = "https://api.anthropic.com/v1/messages";
            
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");

            var payload = new
            {
                model = "claude-3-haiku-20240307",
                max_tokens = 1024,
                system = systemMessage ?? "",
                messages = new[]
                {
                    new { role = "user", content = prompt }
                }
            };

            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var jsonString = await response.Content.ReadAsStringAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(jsonString);
            
            try {
                return json.GetProperty("content")[0].GetProperty("text").GetString();
            } catch {
                return "Error parsing Anthropic response.";
            }
        }
    }
}

