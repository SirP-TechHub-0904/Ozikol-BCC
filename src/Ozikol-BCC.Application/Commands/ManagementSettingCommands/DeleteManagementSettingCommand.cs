using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ManagementSettingCommands
{
    /// <summary>
    /// Command to delete a ManagementSetting by its ID.
    /// </summary>
    public sealed class DeleteManagementSettingCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteManagementSettingCommand.
        /// </summary>
        public DeleteManagementSettingCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the ManagementSetting to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteManagementSettingCommand.
    /// </summary>
    public class DeleteManagementSettingCommandHandler : IRequestHandler<DeleteManagementSettingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ManagementSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteManagementSettingCommandHandler(IGenericRepositoryAsync<ManagementSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the ManagementSetting from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteManagementSettingCommand request, CancellationToken cancellationToken)
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
