using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PostModalCommands
{
    /// <summary>
    /// Command to delete a PostModal by its ID.
    /// </summary>
    public sealed class DeletePostModalCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeletePostModalCommand.
        /// </summary>
        public DeletePostModalCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the PostModal to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeletePostModalCommand.
    /// </summary>
    public class DeletePostModalCommandHandler : IRequestHandler<DeletePostModalCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PostModal> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeletePostModalCommandHandler(IGenericRepositoryAsync<PostModal> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the PostModal from the database.
        /// </summary>
        public async Task<bool> Handle(DeletePostModalCommand request, CancellationToken cancellationToken)
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
