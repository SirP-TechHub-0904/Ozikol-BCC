using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageCategoryCommands
{
    /// <summary>
    /// Command to delete a PageCategory by its ID.
    /// </summary>
    public sealed class DeletePageCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeletePageCategoryCommand.
        /// </summary>
        public DeletePageCategoryCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the PageCategory to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeletePageCategoryCommand.
    /// </summary>
    public class DeletePageCategoryCommandHandler : IRequestHandler<DeletePageCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PageCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeletePageCategoryCommandHandler(IGenericRepositoryAsync<PageCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the PageCategory from the database.
        /// </summary>
        public async Task<bool> Handle(DeletePageCategoryCommand request, CancellationToken cancellationToken)
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
