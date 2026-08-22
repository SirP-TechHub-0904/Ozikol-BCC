using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BcpSettingCommands
{
    /// <summary>
    /// Command to update an existing BcpSetting.
    /// </summary>
    public sealed class UpdateBcpSettingCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateBcpSettingCommand.
        /// </summary>
        public UpdateBcpSettingCommand(BcpSetting data)
        {
            Data = data;
        }

        /// <summary>
        /// The BcpSetting data to be updated.
        /// </summary>
        public BcpSetting Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateBcpSettingCommand.
    /// </summary>
    public class UpdateBcpSettingCommandHandler : IRequestHandler<UpdateBcpSettingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<BcpSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateBcpSettingCommandHandler(IGenericRepositoryAsync<BcpSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the BcpSetting in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateBcpSettingCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
