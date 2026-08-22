using Ozikol_BCC.Application.Dtos;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    public class SmsSendService : ISmsSendService
    {

        private readonly UserManager<Profile> _userManager;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _config;

        public SmsSendService(UserManager<Profile> userManager, Microsoft.Extensions.Configuration.IConfiguration config)
        {
            _userManager = userManager;
            _config = config;
        }
        public async Task<bool> SendSmsWithResult(string contact, string message)
        {
            SmsResponse responsed = new SmsResponse();
            string apiToken = _config["KudiSmsApiKey"] ?? "JeFaYNc8ZzvfDWQ3yB0HSml6jxnLwurVAkTKdMPtb715o4piUEq2RChgIXOGs9";

            try
            {
                var clientsend = new HttpClient();
                var smsrequest = new HttpRequestMessage(HttpMethod.Post, "https://my.kudisms.net/api/sms");
                var smscontent = new MultipartFormDataContent();
                smscontent.Add(new StringContent(apiToken), "token");
                smscontent.Add(new StringContent("NIPSS KURU"), "senderID");
                smscontent.Add(new StringContent(contact), "recipients");
                smscontent.Add(new StringContent(message), "message");
                smscontent.Add(new StringContent("1"), "gateway");
                smsrequest.Content = smscontent;
                var xresponse = await clientsend.SendAsync(smsrequest);
                xresponse.EnsureSuccessStatusCode();
                string responseBody = await xresponse.Content.ReadAsStringAsync();
                responsed = JsonConvert.DeserializeObject<SmsResponse>(responseBody);
                if (responsed.status.ToLower().Contains("success"))
                {
                    return true;
                }
                return false;
                //try
                //{
                //    //get user
                //    string last10DigitsPhoneNumber1 = contact.Substring(Math.Max(0, contact.Length - 10));
                //    var updateuser = await _userManager.Users.FirstOrDefaultAsync(x => x.PhoneNumber.Contains(last10DigitsPhoneNumber1));
                //    if (updateuser != null)
                //    {
                //        updateuser.EmailSent = true;
                //        await _userManager.UpdateAsync(updateuser);
                //    }

                //}
                //catch (Exception e)
                //{

                //}
            }
            catch (Exception c)
            {
                return false;
            }


        }

        public async Task SendSms(string contact, string message)
        {
            SmsResponse responsed = new SmsResponse();
            string apiToken = "JeFaYNc8ZzvfDWQ3yB0HSml6jxnLwurVAkTKdMPtb715o4piUEq2RChgIXOGs9";

            try
            {
                var clientsend = new HttpClient();
                var smsrequest = new HttpRequestMessage(HttpMethod.Post, "https://my.kudisms.net/api/sms");
                var smscontent = new MultipartFormDataContent();
                smscontent.Add(new StringContent(apiToken), "token");
                smscontent.Add(new StringContent("NIPSS KURU"), "senderID");
                smscontent.Add(new StringContent(contact), "recipients");
                smscontent.Add(new StringContent(message), "message");
                smscontent.Add(new StringContent("1"), "gateway");
                smsrequest.Content = smscontent;
                var xresponse = await clientsend.SendAsync(smsrequest);
                xresponse.EnsureSuccessStatusCode();
                string responseBody = await xresponse.Content.ReadAsStringAsync();
                responsed = JsonConvert.DeserializeObject<SmsResponse>(responseBody);
                 
            }
            catch (Exception c)
            {

            }


        }

        public async Task<SmsSendResult> SendCampaignSmsAsync(string contact, string message, string senderId)
        {
            SmsResponse responsed = new SmsResponse();
            string apiToken = _config["KudiSmsApiKey"] ?? "JeFaYNc8ZzvfDWQ3yB0HSml6jxnLwurVAkTKdMPtb715o4piUEq2RChgIXOGs9";

            try
            {
                var clientsend = new HttpClient();
                var smsrequest = new HttpRequestMessage(HttpMethod.Post, "https://my.kudisms.net/api/sms");
                var smscontent = new MultipartFormDataContent();
                smscontent.Add(new StringContent(apiToken), "token");
                smscontent.Add(new StringContent(senderId), "senderID");
                smscontent.Add(new StringContent(contact), "recipients");
                smscontent.Add(new StringContent(message), "message");
                // Gateway 2 is used for Corporate/Refund routes on KudiSMS
                smscontent.Add(new StringContent("2"), "gateway"); 
                smsrequest.Content = smscontent;
                
                var xresponse = await clientsend.SendAsync(smsrequest);
                xresponse.EnsureSuccessStatusCode();
                string responseBody = await xresponse.Content.ReadAsStringAsync();
                responsed = JsonConvert.DeserializeObject<SmsResponse>(responseBody);
                
                if (responsed != null && (responsed.status?.ToLower().Contains("success") == true || responsed.error_code == "000"))
                {
                    return SmsSendResult.Success;
                }

                // Check for Insufficient Unit logic based on KudiSMS error codes 
                // Error 108: The total amount of SMS credit required is more than your balance.
                // 203, 102 are also commonly related to balance in Nigerian gateways.
                if (responsed != null && (responsed.error_code == "108" || responsed.error_code == "102" || responsed.error_code == "203" || (responsed.msg != null && responsed.msg.ToLower().Contains("balance"))))
                {
                    // TODO: Implement sending the system admin an email alert to fix the KudiSMS unit balance!
                    return SmsSendResult.InsufficientKudiBalance;
                }

                return SmsSendResult.Failed;
            }
            catch (Exception)
            {
                return SmsSendResult.Failed;
            }
        }

    }
}

