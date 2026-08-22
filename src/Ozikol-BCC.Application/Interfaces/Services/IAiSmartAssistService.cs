namespace Ozikol_BCC.Application.Interfaces.Services
{
    public class AiCompletionRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string SystemInstruction { get; set; } = "You are an intelligent assistant for the Ozikol Business Command Platform.";
        public double Temperature { get; set; } = 0.7;
        public int MaxTokens { get; set; } = 1000;
        public string? ProviderOverride { get; set; } // Optional: Gemini, OpenAI, Claude, DeepSeek, Qwen, Baidu, Zhipu, Kimi
    }

    public class AiCompletionResult
    {
        public bool IsSuccess { get; set; }
        public string Content { get; set; } = string.Empty;
        public string ProviderUsed { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public interface IAiSmartAssistService
    {
        Task<AiCompletionResult> GenerateCompletionAsync(AiCompletionRequest request, CancellationToken cancellationToken = default);
        Task<string> SummarizeChatHistoryAsync(List<string> messageList, CancellationToken cancellationToken = default);
    }
}
