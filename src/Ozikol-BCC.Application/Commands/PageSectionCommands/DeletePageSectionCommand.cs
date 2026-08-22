using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageSectionCommands
{
    /// <summary>
    /// Command to delete a PageSection by its ID.
    /// </summary>
    public sealed class DeletePageSectionCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeletePageSectionCommand.
        /// </summary>
        public DeletePageSectionCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the PageSection to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeletePageSectionCommand.
    /// </summary>
    public class DeletePageSectionCommandHandler : IRequestHandler<DeletePageSectionCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PageSection> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeletePageSectionCommandHandler(IGenericRepositoryAsync<PageSection> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the PageSection from the database.
        /// </summary>
        public async Task<bool> Handle(DeletePageSectionCommand request, CancellationToken cancellationToken)
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
