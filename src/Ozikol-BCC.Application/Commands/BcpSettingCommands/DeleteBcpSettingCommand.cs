using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BcpSettingCommands
{
    /// <summary>
    /// Command to delete a BcpSetting by its ID.
    /// </summary>
    public sealed class DeleteBcpSettingCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteBcpSettingCommand.
        /// </summary>
        public DeleteBcpSettingCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the BcpSetting to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteBcpSettingCommand.
    /// </summary>
    public class DeleteBcpSettingCommandHandler : IRequestHandler<DeleteBcpSettingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<BcpSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteBcpSettingCommandHandler(IGenericRepositoryAsync<BcpSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the BcpSetting from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteBcpSettingCommand request, CancellationToken cancellationToken)
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
