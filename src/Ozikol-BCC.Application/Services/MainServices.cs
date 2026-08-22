using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services
{
    public class MainServices
    {



        //public static string BucketName(IServiceScopeFactory scopeFactory)
        //{
        //    // Use the service provider to get the DbContext.
        //    using (var scope = scopeFactory.CreateScope())
        //    {
        //        var dbContext = scope.ServiceProvider.GetRequiredService<DashboardDbContext>();
        //        var supw = dbContext.SuperSettings.FirstOrDefault();
        //        if(supw != null)
        //        {
        //            if (!String.IsNullOrEmpty(supw.BucketName))
        //            {
        //                return supw.BucketName;
        //            }
        //        }
        //        // Now you can use the dbContext in your static method.

        //        return await _storageService.BucketName();
        //    }
        //}

        public static string GenerateRefCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();

            return new string(Enumerable.Repeat(chars, 7)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
        public static string SelectColor()
        {
            string xcolor = "";
            var list = new List<string> { "bg-xyz-1","bg-xyz-2","bg-xyz-3","bg-xyz-4","bg-xyz-5","bg-xyz-6","bg-xyz-7","bg-xyz-8","bg-xyz-9","bg-xyz-10","bg-xyz-11","bg-xyz-12","bg-xyz-13","bg-xyz-14","bg-xyz-15","bg-xyz-16","bg-xyz-17","bg-xyz-18","bg-xyz-19","bg-xyz-20","bg-xyz-21","bg-xyz-22","bg-xyz-23","bg-xyz-24","bg-xyz-25","bg-xyz-26","bg-xyz-27","bg-xyz-28","bg-xyz-29","bg-xyz-30","bg-xyz-31","bg-xyz-32","bg-xyz-33","bg-xyz-34","bg-xyz-35","bg-xyz-36","bg-xyz-37","bg-xyz-39","bg-xyz-40","bg-xyz-41","bg-xyz-42","bg-xyz-43","bg-xyz-44","bg-xyz-45","bg-xyz-46","bg-xyz-47","bg-xyz-48","bg-xyz-49","bg-xyz-50","bg-xyz-51","bg-xyz-52","bg-xyz-53","bg-xyz-54","bg-xyz-55","bg-xyz-56","bg-xyz-57","bg-xyz-58","bg-xyz-59","bg-xyz-60","bg-xyz-61","bg-xyz-62","bg-xyz-63","bg-xyz-64","bg-xyz-65","bg-xyz-66","bg-xyz-67","bg-xyz-68","bg-xyz-69","bg-xyz-70","bg-xyz-71","bg-xyz-72","bg-xyz-73","bg-xyz-74","bg-xyz-75","bg-xyz-76","bg-xyz-77","bg-xyz-78","bg-xyz-79","bg-xyz-80","bg-xyz-81","bg-xyz-82","bg-xyz-83","bg-xyz-84","bg-xyz-85","bg-xyz-86","bg-xyz-87","bg-xyz-88","bg-xyz-89","bg-xyz-90","bg-xyz-91","bg-xyz-92","bg-xyz-93","bg-xyz-94","bg-xyz-95","bg-xyz-96","bg-xyz-97","bg-xyz-98","bg-xyz-99","bg-xyz-100","bg-xyz-101","bg-xyz-102","bg-xyz-103","bg-xyz-104","bg-xyz-105","bg-xyz-106","bg-xyz-107","bg-xyz-108","bg-xyz-109","bg-xyz-110","bg-xyz-111","bg-xyz-112","bg-xyz-113","bg-xyz-114","bg-xyz-115","bg-xyz-116","bg-xyz-117","bg-xyz-118","bg-xyz-119","bg-xyz-120","bg-xyz-121","bg-xyz-122","bg-xyz-123","bg-xyz-124","bg-xyz-125","bg-xyz-126","bg-xyz-127","bg-xyz-128","bg-xyz-129","bg-xyz-130","bg-xyz-131","bg-xyz-132","bg-xyz-133","bg-xyz-134","bg-xyz-135","bg-xyz-136","bg-xyz-137","bg-xyz-138","bg-xyz-139","bg-xyz-140","bg-xyz-141","bg-xyz-142","bg-xyz-143","bg-xyz-144","bg-xyz-145","bg-xyz-146","bg-xyz-147","bg-xyz-148","bg-xyz-149","bg-xyz-150","bg-xyz-151","bg-xyz-152","bg-xyz-153","bg-xyz-154","bg-xyz-155","bg-xyz-156","bg-xyz-157","bg-xyz-158","bg-xyz-159","bg-xyz-160","bg-xyz-161","bg-xyz-162","bg-xyz-163","bg-xyz-164","bg-xyz-165","bg-xyz-166","bg-xyz-167","bg-xyz-168","bg-xyz-169","bg-xyz-170","bg-xyz-171","bg-xyz-172","bg-xyz-173","bg-xyz-174","bg-xyz-175","bg-xyz-176","bg-xyz-177","bg-xyz-178","bg-xyz-179","bg-xyz-180","bg-xyz-181","bg-xyz-182","bg-xyz-183","bg-xyz-184","bg-xyz-185","bg-xyz-186","bg-xyz-187","bg-xyz-188","bg-xyz-189","bg-xyz-190","bg-xyz-191","bg-xyz-192","bg-xyz-193","bg-xyz-194","bg-xyz-195","bg-xyz-196","bg-xyz-197","bg-xyz-198","bg-xyz-199","bg-xyz-200","bg-xyz-201","bg-xyz-202","bg-xyz-203","bg-xyz-204","bg-xyz-205","bg-xyz-206","bg-xyz-207","bg-xyz-208","bg-xyz-209","bg-xyz-210","bg-xyz-211","bg-xyz-212","bg-xyz-213","bg-xyz-214","bg-xyz-215","bg-xyz-216","bg-xyz-217","bg-xyz-218","bg-xyz-219","bg-xyz-220","bg-xyz-221","bg-xyz-222","bg-xyz-223","bg-xyz-224","bg-xyz-225","bg-xyz-226","bg-xyz-227","bg-xyz-228","bg-xyz-229","bg-xyz-230","bg-xyz-231","bg-xyz-232","bg-xyz-233","bg-xyz-234","bg-xyz-235","bg-xyz-236","bg-xyz-237","bg-xyz-238","bg-xyz-239","bg-xyz-240","bg-xyz-241","bg-xyz-242","bg-xyz-243","bg-xyz-244","bg-xyz-245","bg-xyz-246","bg-xyz-247","bg-xyz-248","bg-xyz-249","bg-xyz-250","bg-xyz-251","bg-xyz-252","bg-xyz-253","bg-xyz-254","bg-xyz-255","bg-xyz-256","bg-xyz-257","bg-xyz-258","bg-xyz-259","bg-xyz-260","bg-xyz-261","bg-xyz-262","bg-xyz-263","bg-xyz-264","bg-xyz-265","bg-xyz-266","bg-xyz-267","bg-xyz-268","bg-xyz-269","bg-xyz-270","bg-xyz-271","bg-xyz-272","bg-xyz-273","bg-xyz-274","bg-xyz-276","bg-xyz-277","bg-xyz-278","bg-xyz-279","bg-xyz-280","bg-xyz-281","bg-xyz-282","bg-xyz-283","bg-xyz-284","bg-xyz-285","bg-xyz-286","bg-xyz-287","bg-xyz-288","bg-xyz-289","bg-xyz-290","bg-xyz-291","bg-xyz-292","bg-xyz-293","bg-xyz-294","bg-xyz-295","bg-xyz-296","bg-xyz-297","bg-xyz-298","bg-xyz-299","bg-xyz-300","bg-xyz-301","bg-xyz-302","bg-xyz-303","bg-xyz-304","bg-xyz-305","bg-xyz-306","bg-xyz-307","bg-xyz-308","bg-xyz-309","bg-xyz-310","bg-xyz-311","bg-xyz-312","bg-xyz-313","bg-xyz-314","bg-xyz-315","bg-xyz-316","bg-xyz-317","bg-xyz-318","bg-xyz-319","bg-xyz-320","bg-xyz-321","bg-xyz-322","bg-xyz-323","bg-xyz-324","bg-xyz-325","bg-xyz-326","bg-xyz-327","bg-xyz-328","bg-xyz-329","bg-xyz-330","bg-xyz-331","bg-xyz-332","bg-xyz-333","bg-xyz-334","bg-xyz-335","bg-xyz-336","bg-xyz-337","bg-xyz-338","bg-xyz-339","bg-xyz-340","bg-xyz-341","bg-xyz-342","bg-xyz-343","bg-xyz-344","bg-xyz-345","bg-xyz-346","bg-xyz-347","bg-xyz-348","bg-xyz-349","bg-xyz-350","bg-xyz-351","bg-xyz-352","bg-xyz-353","bg-xyz-354","bg-xyz-355","bg-xyz-356","bg-xyz-357","bg-xyz-358","bg-xyz-359","bg-xyz-360","bg-xyz-361","bg-xyz-362","bg-xyz-363","bg-xyz-364","bg-xyz-365","bg-xyz-366","bg-xyz-367","bg-xyz-368","bg-xyz-369","bg-xyz-370","bg-xyz-371","bg-xyz-372","bg-xyz-373","bg-xyz-374","bg-xyz-375","bg-xyz-376","bg-xyz-377","bg-xyz-378","bg-xyz-379","bg-xyz-380","bg-xyz-381","bg-xyz-382","bg-xyz-383","bg-xyz-384","bg-xyz-385","bg-xyz-386","bg-xyz-387","bg-xyz-388","bg-xyz-389","bg-xyz-390","bg-xyz-391","bg-xyz-392","bg-xyz-393","bg-xyz-394","bg-xyz-395","bg-xyz-396","bg-xyz-398","bg-xyz-399","bg-xyz-400","bg-xyz-401","bg-xyz-402","bg-xyz-403","bg-xyz-404","bg-xyz-405","bg-xyz-406","bg-xyz-407","bg-xyz-408","bg-xyz-409","bg-xyz-410","bg-xyz-411","bg-xyz-412","bg-xyz-413","bg-xyz-414","bg-xyz-415","bg-xyz-416","bg-xyz-417","bg-xyz-418","bg-xyz-419","bg-xyz-420","bg-xyz-421","bg-xyz-422","bg-xyz-423","bg-xyz-424","bg-xyz-425","bg-xyz-426","bg-xyz-427","bg-xyz-428","bg-xyz-429","bg-xyz-430","bg-xyz-431","bg-xyz-432","bg-xyz-433","bg-xyz-434","bg-xyz-435","bg-xyz-436","bg-xyz-437","bg-xyz-438","bg-xyz-439","bg-xyz-440","bg-xyz-441","bg-xyz-442","bg-xyz-443","bg-xyz-444","bg-xyz-445","bg-xyz-446","bg-xyz-447","bg-xyz-448","bg-xyz-449","bg-xyz-450","bg-xyz-451","bg-xyz-452","bg-xyz-453","bg-xyz-454","bg-xyz-455","bg-xyz-456","bg-xyz-457","bg-xyz-458","bg-xyz-459","bg-xyz-460","bg-xyz-461","bg-xyz-462","bg-xyz-463","bg-xyz-464","bg-xyz-465","bg-xyz-466","bg-xyz-467","bg-xyz-468","bg-xyz-469","bg-xyz-470","bg-xyz-471","bg-xyz-472","bg-xyz-473","bg-xyz-474","bg-xyz-475","bg-xyz-476","bg-xyz-477","bg-xyz-478","bg-xyz-479","bg-xyz-480","bg-xyz-481","bg-xyz-482","bg-xyz-483","bg-xyz-484","bg-xyz-485","bg-xyz-486","bg-xyz-487","bg-xyz-488","bg-xyz-489","bg-xyz-490","bg-xyz-491","bg-xyz-492","bg-xyz-493","bg-xyz-494","bg-xyz-495","bg-xyz-496","bg-xyz-497","bg-xyz-498","bg-xyz-499","bg-xyz-500"
                };

            var random = new Random();
            xcolor = list[random.Next(list.Count)];
            return xcolor;
        }

        public static bool VerifyPortfolio(string data)
        {
            if (data == "786f812a-8436-4587-8f1d-c9dc68a48898.c2a3c223-b3e3-427a-95ce-893fc93e1104.683b2c9c-6e1f-4354-9081-ed693bdf5728")
            {
                return true;
            }
            return false;
        }

        public string GetMacAddress()
        {
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var networkInterface in networkInterfaces)
            {
                if (networkInterface.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    networkInterface.OperationalStatus == OperationalStatus.Up)
                {
                    return networkInterface.GetPhysicalAddress().ToString();
                }
            }
            return string.Empty;
        }
        public static string RemoveHtmlAndCss(string input)
        {
            if (!String.IsNullOrEmpty(input))
            {


                // Remove HTML tags
                string noHtmlTags = Regex.Replace(input, @"<[^>]+>|&nbsp;", string.Empty);

                // Remove CSS properties
                string noCssProperties = Regex.Replace(noHtmlTags, @"\sstyle\s*=\s*""[^""]*""", string.Empty);

                return noCssProperties;
            }
            return "BIOGRAPHY";
        }
        // public static string Value(this IHtmlHelper htmlHelper, DateTime? value)
        //{
        //    // Your implementation here
        //    // Example: return someValue;
        //    if (value.HasValue)
        //    {
        //        return value.Value.ToString("dd.MM.yyyy");
        //    }

        //    return string.Empty;
        //}


        public static string GenerateSlug(string title)
        {
            if (string.IsNullOrWhiteSpace(title))
                return "";

            // Convert to lowercase
            string slug = title.ToLower();

            // Replace non-alphanumeric characters with hyphen
            slug = Regex.Replace(slug, @"[^a-z0-9]+", "-");

            // Remove multiple hyphens
            slug = Regex.Replace(slug, @"-+", "-");

            // Trim hyphens from start and end
            slug = slug.Trim('-');

            return slug;
        }
    }


}

