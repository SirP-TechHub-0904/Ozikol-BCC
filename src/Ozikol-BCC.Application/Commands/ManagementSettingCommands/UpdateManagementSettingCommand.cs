using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ManagementSettingCommands
{
    /// <summary>
    /// Command to update an existing ManagementSetting.
    /// </summary>
    public sealed class UpdateManagementSettingCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateManagementSettingCommand.
        /// </summary>
        public UpdateManagementSettingCommand(ManagementSetting data)
        {
            Data = data;
        }

        /// <summary>
        /// The ManagementSetting data to be updated.
        /// </summary>
        public ManagementSetting Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateManagementSettingCommand.
    /// </summary>
    public class UpdateManagementSettingCommandHandler : IRequestHandler<UpdateManagementSettingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ManagementSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateManagementSettingCommandHandler(IGenericRepositoryAsync<ManagementSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the ManagementSetting in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateManagementSettingCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
