using MediatR;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Application.Commands.AiCommands
{
    public class GenerateAiCompletionCommand : IRequest<AiCompletionResult>
    {
        public string Prompt { get; set; } = string.Empty;
        public string SystemInstruction { get; set; } = "You are an intelligent assistant.";
        public double Temperature { get; set; } = 0.7;
        public int MaxTokens { get; set; } = 1000;
        public string? ProviderOverride { get; set; }
    }

    public class GenerateAiCompletionCommandHandler : IRequestHandler<GenerateAiCompletionCommand, AiCompletionResult>
    {
        private readonly IAiSmartAssistService _aiService;

        public GenerateAiCompletionCommandHandler(IAiSmartAssistService aiService)
        {
            _aiService = aiService;
        }

        public async Task<AiCompletionResult> Handle(GenerateAiCompletionCommand request, CancellationToken cancellationToken)
        {
            return await _aiService.GenerateCompletionAsync(new AiCompletionRequest
            {
                Prompt = request.Prompt,
                SystemInstruction = request.SystemInstruction,
                Temperature = request.Temperature,
                MaxTokens = request.MaxTokens,
                ProviderOverride = request.ProviderOverride
            }, cancellationToken);
        }
    }
}
