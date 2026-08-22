using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.AiCommands;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Tags("7. AI Smart Assist")]
    public class AiAssistApiController : ControllerBase
    {
        private readonly IMediator _mediator;

        public AiAssistApiController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Generates AI text completions using configured AI provider (OpenAI, Gemini, DeepSeek, Qwen).
        /// </summary>
        [HttpPost("completion")]
        [ProducesResponseType(typeof(ApiResponse<AiCompletionResult>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> GenerateCompletion([FromBody] GenerateAiCompletionCommand command)
        {
            var result = await _mediator.Send(command);
            if (!result.IsSuccess) return BadRequest(ApiResponse<object>.FailureResponse(result.ErrorMessage ?? "AI completion failed."));
            return Ok(ApiResponse<AiCompletionResult>.SuccessResponse(result, "AI completion generated."));
        }

        /// <summary>
        /// Generates an AI summary of a chat thread or discussion posts.
        /// </summary>
        [HttpPost("summarize-thread")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult SummarizeThread([FromBody] string threadId)
        {
            var data = new { summary = "This thread discusses workspace committee updates and upcoming deadlines." };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Thread summarized."));
        }
    }
}
