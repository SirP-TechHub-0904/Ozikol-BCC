using Ozikol_BCC.Application.Repository.Base;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using Ozikol_BCC.Application.Behaviors;
using System.Reflection;

namespace Ozikol_BCC.Application;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers Application-layer repository abstractions shared by command/query handlers.
    /// Feature-specific services should be added here as the BCP modules mature.
    /// </summary>
    public static IServiceCollection AddApplicationExtensions(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));

        //services.AddSingleton<ITenantProvider, TenantProvider>();
        services.AddTransient(typeof(IGenericRepositoryAsync<>), typeof(GenericRepositoryAsync<>)); 
        services.AddTransient<IUnitOfWork, UnitOfWork>();
        services.AddScoped<Ozikol_BCC.Application.Repository.Services.ISettingsService, Ozikol_BCC.Application.Repository.Services.SettingsService>();
        services.AddScoped<Ozikol_BCC.Application.Services.AWS.IStorageService, Ozikol_BCC.Application.Services.AWS.StorageService>();
        services.AddScoped<Ozikol_BCC.Application.Repository.GeneralRepository.Users.IUserRepositoryAsync, Ozikol_BCC.Application.Repository.GeneralRepository.Users.UserRepositoryAsync>();
        services.AddScoped<Ozikol_BCC.Application.Repository.DeviceInformation.IDeviceService, Ozikol_BCC.Application.Repository.DeviceInformation.DeviceService>();
        services.AddScoped<Ozikol_BCC.Application.Repository.NotifyRegister.INotifyRegisterService, Ozikol_BCC.Application.Repository.NotifyRegister.NotifyRegisterService>();
        services.AddScoped<Ozikol_BCC.Application.Repository.NotifyRegister.IEmailSendService, Ozikol_BCC.Application.Repository.NotifyRegister.EmailSendService>();
        services.AddScoped<Ozikol_BCC.Application.Repository.NotifyRegister.ISmsSendService, Ozikol_BCC.Application.Repository.NotifyRegister.SmsSendService>();
        services.AddScoped<Ozikol_BCC.Application.Repository.NotifyRegister.IZeptoMailService, Ozikol_BCC.Application.Repository.NotifyRegister.ZeptoMailService>();
        services.AddScoped<Ozikol_BCC.Application.Repository.BCP.UserManagement.IBcpUserManagementRepository, Ozikol_BCC.Application.Repository.BCP.UserManagement.BcpUserManagementRepository>();
        services.AddScoped<Ozikol_BCC.Application.Repository.Bcp.Groups.IBcpGroupRepository, Ozikol_BCC.Application.Repository.Bcp.Groups.BcpGroupRepository>();
        services.AddScoped<Ozikol_BCC.Application.Services.IOtpVerificationService, Ozikol_BCC.Application.Services.OtpVerificationService>();
        services.AddScoped<Ozikol_BCC.Application.Services.IMessageTemplateService, Ozikol_BCC.Application.Services.MessageTemplateService>();
        services.AddScoped<Ozikol_BCC.Application.Services.LoggerLibrary>();
        services.AddTransient<Ozikol_BCC.Application.Seeders.DefaultTenantSeeder>();
        return services;
    }
}
