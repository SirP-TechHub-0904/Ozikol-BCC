using Ozikol_BCC.Application.Repository.NotifyRegister;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "PlatformOwner,mAdmin")]
    public class ZeptoMailTestController : ControllerBase
    {
        private readonly IZeptoMailService _zeptoMailService;

        public ZeptoMailTestController(IZeptoMailService zeptoMailService)
        {
            _zeptoMailService = zeptoMailService;
        }

        [HttpPost("test-connection")]
        public async Task<IActionResult> TestConnection([FromForm] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { success = false, message = "Please provide an email address to test the connection." });

            var result = await _zeptoMailService.SendEmailAsync(
                toEmail: email,
                toName: "Admin Test",
                subject: "ZeptoMail Connection Test",
                htmlBody: "<h3>Connection Successful!</h3><p>Your ZeptoMail API integration is working perfectly.</p>",
                trackingGuid: System.Guid.NewGuid().ToString()
            );

            if (result.IsSuccess)
            {
                return Ok(new { success = true, message = "Connection successful! Test email sent." });
            }
            else
            {
                return BadRequest(new { success = false, message = result.ErrorMessage });
            }
        }
    }
}

