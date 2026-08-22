using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Services
{
    public interface IBcpSmartAssistService
    {
        Task<string> GenerateChatResponseAsync(string prompt, string? systemMessage = null);
    }
}

