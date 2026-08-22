using Amazon.Runtime.Internal.Endpoints.StandardLibrary;
using Amazon.Runtime.Internal;
using Ozikol_BCC.Application.Dtos.UsersDto;
using Ozikol_BCC.Application.Services.AWS;
using Ozikol_BCC.Domain.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using System.Xml.Linq;
using static Amazon.S3.Util.S3EventNotification;
using static Ozikol_BCC.Domain.Enum.Enum;
using Microsoft.AspNetCore.WebUtilities;
using Ozikol_BCC.Application.Dtos;
using Ozikol_BCC.Application.Repository.Services;

namespace Ozikol_BCC.Application.Repository.GeneralRepository.Users
{
    public class UserRepositoryAsync : IUserRepositoryAsync
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<Profile> _userManager;
        private readonly RoleManager<AppRole> _roleManager;
        private readonly IStorageService _storageService;
        private readonly ISettingsService _settingsService;
        public UserRepositoryAsync(UserManager<Profile> userManager, RoleManager<AppRole> roleManager, IStorageService storageService, IHttpContextAccessor httpContextAccessor, ISettingsService settingsService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _storageService = storageService;
            _httpContextAccessor = httpContextAccessor;
            _settingsService = settingsService;
        }

        public async Task<ResponseDto> AddAsync(UserDto entity, IFormFile? file)
        {
            ResponseDto response = new ResponseDto();
            var checkmax = await _settingsService.GetMaxUserCount();
            if (checkmax == true)
            {
                response.Result = "Maximum Limit Readed. Kindly Upgrade your Account";
                return response;
            }
            else
            {

                var user = new Profile
                {
                    FirstName = entity.FirstName,
                    MiddleName = entity.MiddleName,
                    LastName = entity.LastName,
                    Email = entity.Email,
                    UserName = entity.Username,
                    PhoneNumber = entity.Phone,
                    DateOfBirth = entity.DateOfBirth,
                    UserStatus = UserStatus.Active,
                    Gender = entity.Gender
                };
                try
                {
                    var fileresponse = await _storageService.MainUploadFileReturnUrlAsync(null, file);
                    if (fileresponse.Message.Contains("200"))
                    {
                        // user.PassportFilePathUrl = fileresponse.Url;
                        // user.PassportFilePathKey = fileresponse.Key;
                    }
                }
                catch (Exception x)
                {

                }
                var creataccount = await _userManager.CreateAsync(user, entity.Password);
                if (creataccount.Succeeded)
                {
                    //add to role
                    try
                    {
                        if (entity.UserRoles == null)
                        {
                            entity.UserRoles = new List<string>();
                            entity.UserRoles.Add("User");
                        }
                        else
                        {
                            entity.UserRoles.Add("User");
                        }
                        if (entity.UserRoles.Any())
                        {
                            foreach (var role in entity.UserRoles)
                            {
                                await _userManager.AddToRoleAsync(user, role);
                            }
                        }
                    }
                    catch (Exception c) { }
                    response.Result = "successfull";
                    return response;
                }
                StringBuilder sb = new StringBuilder();
                foreach (var error in creataccount.Errors)
                {
                    sb.AppendLine(error.Description);
                }
                response.Result = sb.ToString();
                return response;
            }

        }

        public async Task<ResponseDto> ChangeEmailAsync(ChangeEmailDto entity)
        {
            ResponseDto StatusMessage = new ResponseDto();
            var user = await _userManager.FindByEmailAsync(entity.Email);
            var email = await _userManager.GetEmailAsync(user);
            if (entity.NewEmail != email)
            {
                var userId = await _userManager.GetUserIdAsync(user);
                var code = await _userManager.GenerateChangeEmailTokenAsync(user, entity.NewEmail);
                code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));



                var request = _httpContextAccessor.HttpContext.Request;

                var callbackUrl = new UriBuilder()
                {
                    Scheme = request.Scheme,
                    Host = request.Host.Host,
                    Port = request.Host.Port.GetValueOrDefault(-1),
                    Path = request.PathBase + "/Account/ConfirmEmailChange",
                    Query = $"userId={userId}&email={entity.NewEmail}&code={code}"
                };

                StatusMessage.Data = callbackUrl.Uri.ToString();
                var send = await SendEmailAsync(entity.Id, EmailType.ChangeEmail, callbackUrl.ToString());

                StatusMessage.Result = "Confirmation link to change email sent. Please check your email.";
                return StatusMessage;
            }

            StatusMessage.Result = "Your email is unchanged.";
            return StatusMessage;
        }

        public async Task DeleteAsync(string id)
        {
            var data = await _userManager.FindByIdAsync(id);
            if (data != null)
            {
                await _userManager.DeleteAsync(data);
            }
        }

        public async Task<IReadOnlyList<ListUsersDto>> GetAllDeletedUsersAsync()
        {
            var usersWithRoles = new List<ListUsersDto>();

            var users = await _userManager.Users.Where(x => x.UserStatus == UserStatus.Deleted).ToListAsync();

            foreach (var user in users)
            {
                var userDto = new ListUsersDto
                {
                    Id = user.Id,
                    Fullname = user.FullName, // Assuming you have a custom property for FullName in your IdentityUser class
                    Email = user.Email,
                    DateOfBirth = user.DateOfBirth,
                    //Gender = user.Gender,
                    Phone = user.PhoneNumber,
                    UserStatus = user.UserStatus
                };

                var roles = await _userManager.GetRolesAsync(user);
                userDto.Role = string.Join(", ", roles);

                usersWithRoles.Add(userDto);
            }

            return usersWithRoles;
        }

        public async Task<IReadOnlyList<ListUsersDto>> GetAllUsersAsync()
        {
            var usersWithRoles = new List<ListUsersDto>();

            var users = await _userManager.Users.Where(x => x.UserStatus != UserStatus.Deleted).ToListAsync();

            foreach (var user in users)
            {
                var userDto = new ListUsersDto
                {
                    Id = user.Id,
                    Fullname = user.FullName, // Assuming you have a custom property for FullName in your IdentityUser class
                    Email = user.Email,
                    DateOfBirth = user.DateOfBirth,
                    //Gender = user.Gender,
                    Phone = user.PhoneNumber,
                    UserStatus = user.UserStatus
                };

                var roles = await _userManager.GetRolesAsync(user);
                userDto.Role = string.Join(", ", roles);

                usersWithRoles.Add(userDto);
            }

            return usersWithRoles;
        }

        public async Task<UserDto> GetByIdAsync(string id)
        {
            var data = await _userManager.FindByIdAsync(id);
            if (data != null)
            {
                var resultdata = new UserDto
                {
                    Id = data.Id,
                    FirstName = data.FirstName,
                    MiddleName = data.MiddleName,
                    LastName = data.LastName,
                    Email = data.Email,
                    Phone = data.PhoneNumber,
                    DateOfBirth = data.DateOfBirth,
                    UserStatus = data.UserStatus
                    // PassportFilePathUrl = data.PassportFilePathUrl,
                    // PassportFilePathKey = data.PassportFilePathKey
                };

                var roles = await GetDashboardRolesAsync();
                var userroles = await _userManager.GetRolesAsync(data);
                resultdata.Roles = roles.ToList();
                resultdata.UserRoles = userroles.ToList();
                return resultdata;
            }
            return null;
        }

        public async Task<IReadOnlyList<ListUsersDto>> GetDashboardAllDeletedUsersAsync()
        {
            var usersWithRoles = new List<ListUsersDto>();


            var excludedRoles = new List<string> { "PlatformOwner", "SubAdmin", "JAdmin" };
            var filteredUsers = await _userManager.Users.Where(x => x.UserStatus == UserStatus.Deleted).ToListAsync();
            var usersNotInRoles = filteredUsers.Where(user =>
        !excludedRoles.Any(role =>
        _userManager.IsInRoleAsync(user, role).GetAwaiter().GetResult()
        )
        ).ToList();

            foreach (var user in usersNotInRoles)
            {
                var userDto = new ListUsersDto
                {
                    Id = user.Id,
                    Fullname = user.FullName, // Assuming you have a custom property for FullName in your IdentityUser class
                    Email = user.Email,
                    DateOfBirth = user.DateOfBirth,
                    //Gender = user.Gender,
                    Phone = user.PhoneNumber,
                    UserStatus = user.UserStatus
                };

                var roles = await _userManager.GetRolesAsync(user);
                userDto.Role = string.Join(", ", roles);

                usersWithRoles.Add(userDto);
            }

            return usersWithRoles;
        }

        public async Task<IReadOnlyList<ListUsersDto>> GetDashboardAllUsersAsync()
        {
            var usersWithRoles = new List<ListUsersDto>();


            var excludedRoles = new List<string> { "PlatformOwner", "SubAdmin", "JAdmin" };
            var filteredUsers = await _userManager.Users.Where(x => x.UserStatus != UserStatus.Deleted).ToListAsync();
            var usersNotInRoles = filteredUsers.Where(user =>
        !excludedRoles.Any(role =>
        _userManager.IsInRoleAsync(user, role).GetAwaiter().GetResult()
        )
        ).ToList();

            foreach (var user in usersNotInRoles)
            {
                var userDto = new ListUsersDto
                {
                    Id = user.Id,
                    Fullname = user.FullName, // Assuming you have a custom property for FullName in your IdentityUser class
                    Email = user.Email,
                    DateOfBirth = user.DateOfBirth,
                    //Gender = user.Gender,
                    Phone = user.PhoneNumber,
                    UserStatus = user.UserStatus,
                    Username = user.UserName
                };

                var roles = await _userManager.GetRolesAsync(user);
                userDto.Role = string.Join(", ", roles);

                usersWithRoles.Add(userDto);
            }

            return usersWithRoles;
        }

        public async Task<IList<string>> GetDashboardRolesAsync()
        {
            return await _roleManager.Roles.Where(x => x.Name.ToLower() != "platformowner" && x.Name.ToLower() != "User" && x.Name.ToLower() != "SubAdmin" && x.Name.ToLower() != "JAdmin").OrderBy(x => x.Name).Select(r => r.Name).ToListAsync();
        }

        public async Task<FullProfileDto> GetFullUserDetailsByIdAsync(string id)
        {
            var data = await _userManager.FindByIdAsync(id);
            if (data != null)
            {
                return new FullProfileDto
                {
                    FullName = data.FullName,
                    Email = data.Email,
                    DateOfBirth = data.DateOfBirth,
                    Phone = data.PhoneNumber,
                    Id = data.Id,
                    UserStatus = data.UserStatus
                    // PassportFilePathUrl = data.PassportFilePathUrl
                };
            }
            return null;
        }

        public async Task<UserDetailsDto> GetUserDetailsByIdAsync(string id)
        {
            var data = await _userManager.FindByIdAsync(id);
            if (data != null)
            {
                return new UserDetailsDto
                {
                    FullName = data.FullName,
                    Email = data.Email,
                    DateOfBirth = data.DateOfBirth,
                    Phone = data.PhoneNumber,
                    Id = data.Id,
                    UserStatus = data.UserStatus
                    // PassportFilePathUrl = data.PassportFilePathUrl
                };
            }
            return null;
        }

        public Task<ResponseDto> SendEmailAsync(string id, EmailType emailType, string message)
        {
            throw new NotImplementedException();
        }

        public async Task UpdateAsync(UserDto entity, IFormFile? file)
        {
            var user = await _userManager.FindByIdAsync(entity.Id); // Assuming you have a reference to the UserManager<Profile> called 'userManager'

            if (user != null)
            {
                user.FirstName = entity.FirstName;
                user.MiddleName = entity.MiddleName;
                user.LastName = entity.LastName;
                user.PhoneNumber = entity.Phone;
                user.DateOfBirth = entity.DateOfBirth;
                user.UserStatus = entity.UserStatus;
                try
                {
                    var fileresponse = await _storageService.MainUploadFileReturnUrlAsync(null, file);
                    if (fileresponse.Message.Contains("200"))
                    {
                        // user.PassportFilePathUrl = fileresponse.Url;
                        // user.PassportFilePathKey = fileresponse.Key;
                    }
                }
                catch (Exception x)
                {

                }
                await _userManager.UpdateAsync(user);
                //
                try
                {
                    if (entity.UserRoles.Any())
                    {
                        foreach (var role in entity.UserRoles)
                        {
                            var mainuserroles = await _userManager.GetRolesAsync(user);
                            if (!mainuserroles.Contains(role))
                            {
                                await _userManager.AddToRoleAsync(user, role);
                            }

                        }
                    }
                }
                catch (Exception c) { }

                try
                {
                    var isInRole = await _userManager.IsInRoleAsync(user, "User");
                    if (!isInRole)
                    {
                        await _userManager.AddToRoleAsync(user, "User");
                    }


                }
                catch (Exception c)
                {

                }
            }
            else
            {
                throw new Exception("User not found.");
            }
        }
    }
}

