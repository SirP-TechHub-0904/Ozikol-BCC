using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageSectionListCommands
{
    /// <summary>
    /// Command to delete a PageSectionList by its ID.
    /// </summary>
    public sealed class DeletePageSectionListCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeletePageSectionListCommand.
        /// </summary>
        public DeletePageSectionListCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the PageSectionList to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeletePageSectionListCommand.
    /// </summary>
    public class DeletePageSectionListCommandHandler : IRequestHandler<DeletePageSectionListCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PageSectionList> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeletePageSectionListCommandHandler(IGenericRepositoryAsync<PageSectionList> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the PageSectionList from the database.
        /// </summary>
        public async Task<bool> Handle(DeletePageSectionListCommand request, CancellationToken cancellationToken)
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
