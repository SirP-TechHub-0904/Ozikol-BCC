using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ConfigSettingCommands
{
    /// <summary>
    /// Command to update an existing ConfigSetting.
    /// </summary>
    public sealed class UpdateConfigSettingCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateConfigSettingCommand.
        /// </summary>
        public UpdateConfigSettingCommand(ConfigSetting data)
        {
            Data = data;
        }

        /// <summary>
        /// The ConfigSetting data to be updated.
        /// </summary>
        public ConfigSetting Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateConfigSettingCommand.
    /// </summary>
    public class UpdateConfigSettingCommandHandler : IRequestHandler<UpdateConfigSettingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ConfigSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateConfigSettingCommandHandler(IGenericRepositoryAsync<ConfigSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the ConfigSetting in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateConfigSettingCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
