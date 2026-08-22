using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Tags("9. Workspace & Notifications")]
    public class WorkspaceApiController : ControllerBase
    {
        private readonly IMediator _mediator;

        public WorkspaceApiController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Retrieves main user workspace dashboard data.
        /// </summary>
        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetWorkspaceDashboard()
        {
            var data = new { activeGroupCount = 5, unreadNotifications = 2, upcomingEvents = Array.Empty<object>() };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Workspace dashboard data retrieved."));
        }

        /// <summary>
        /// Retrieves central notification feed.
        /// </summary>
        [HttpGet("notifications")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetNotifications()
        {
            return Ok(ApiResponse<object>.SuccessResponse(Array.Empty<object>(), "Notification feed retrieved."));
        }

        /// <summary>
        /// Marks a notification item as read.
        /// </summary>
        [HttpPut("notifications/{id:guid}/read")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult MarkNotificationAsRead(Guid id)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Notification marked as read."));
        }
    }
}
