using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ConfigSettingCommands
{
    /// <summary>
    /// Command to delete a ConfigSetting by its ID.
    /// </summary>
    public sealed class DeleteConfigSettingCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteConfigSettingCommand.
        /// </summary>
        public DeleteConfigSettingCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the ConfigSetting to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteConfigSettingCommand.
    /// </summary>
    public class DeleteConfigSettingCommandHandler : IRequestHandler<DeleteConfigSettingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ConfigSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteConfigSettingCommandHandler(IGenericRepositoryAsync<ConfigSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the ConfigSetting from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteConfigSettingCommand request, CancellationToken cancellationToken)
        {
            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity != null)
            {
                await _repository.DeleteAsync(entity);
                return true;
            }
            return false; // Not found
        }
    }
}
