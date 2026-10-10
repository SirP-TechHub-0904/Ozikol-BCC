using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    public class ZeptoMailService : IZeptoMailService
    {
        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext _context;

        public ZeptoMailService(HttpClient httpClient, DashboardDbContext context)
        {
            _httpClient = httpClient;
            _context = context;
        }

        public async Task<(bool IsSuccess, string ErrorMessage)> SendEmailAsync(string toEmail, string toName, string subject, string htmlBody, string trackingGuid)
        {
            try
            {
                var settings = await _context.MisConfigurationSettings.FirstOrDefaultAsync();
                if (settings == null || string.IsNullOrWhiteSpace(settings.ZeptoMailApiKey))
                {
                    return (false, "ZeptoMail API Key is not configured in settings.");
                }

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                _httpClient.DefaultRequestHeaders.Add("Authorization", settings.ZeptoMailApiKey);

                var payload = new
                {
                    bounce_address = "bounce@bounce.zeptomail.com", // You may want to configure this later
                    from = new
                    {
                        address = !string.IsNullOrEmpty(settings.ZeptoMailSenderEmail) ? settings.ZeptoMailSenderEmail : "noreply@juray.com",
                        name = !string.IsNullOrEmpty(settings.ZeptoMailSenderName) ? settings.ZeptoMailSenderName : "Juray Universal"
                    },
                    to = new[]
                    {
                        new
                        {
                            email_address = new
                            {
                                address = toEmail,
                                name = toName
                            }
                        }
                    },
                    subject = subject,
                    htmlbody = htmlBody + $"<img src=\"https://yourdomain.com/api/tracking/pixel/{trackingGuid}\" width=\"1\" height=\"1\" />"
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("https://api.zeptomail.com/v1.1/email", content);

                if (response.IsSuccessStatusCode)
                {
                    return (true, string.Empty);
                }
                else
                {
                    string friendlyError;
                    switch (response.StatusCode)
                    {
                        case System.Net.HttpStatusCode.Unauthorized:
                            friendlyError = "Invalid or expired ZeptoMail API Key. Please verify it in BCP Settings.";
                            break;
                        case System.Net.HttpStatusCode.BadRequest:
                            friendlyError = "The email configuration or sender address is invalid.";
                            break;
                        case System.Net.HttpStatusCode.PaymentRequired:
                            friendlyError = "ZeptoMail account has run out of email credits.";
                            break;
                        default:
                            friendlyError = "The email provider rejected the request. Please check your ZeptoMail configuration.";
                            break;
                    }
                    return (false, friendlyError);
                }
            }
            catch (HttpRequestException)
            {
                return (false, "Unable to connect to ZeptoMail servers. Please check your internet connection.");
            }
            catch (Exception)
            {
                return (false, "An unexpected system error occurred while attempting to send the email.");
            }
        }
    }
}

