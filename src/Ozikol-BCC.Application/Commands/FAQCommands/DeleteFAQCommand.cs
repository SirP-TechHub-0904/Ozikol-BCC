using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.FAQCommands
{
    /// <summary>
    /// Command to delete a FAQ by its ID.
    /// </summary>
    public sealed class DeleteFAQCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteFAQCommand.
        /// </summary>
        public DeleteFAQCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the FAQ to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteFAQCommand.
    /// </summary>
    public class DeleteFAQCommandHandler : IRequestHandler<DeleteFAQCommand, bool>
    {
        private readonly IGenericRepositoryAsync<FAQ> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteFAQCommandHandler(IGenericRepositoryAsync<FAQ> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the FAQ from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteFAQCommand request, CancellationToken cancellationToken)
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
