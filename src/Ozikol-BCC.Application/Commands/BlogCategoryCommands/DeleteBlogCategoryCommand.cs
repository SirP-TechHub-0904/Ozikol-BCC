using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BlogCategoryCommands
{
    /// <summary>
    /// Command to delete a BlogCategory by its ID.
    /// </summary>
    public sealed class DeleteBlogCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteBlogCategoryCommand.
        /// </summary>
        public DeleteBlogCategoryCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the BlogCategory to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteBlogCategoryCommand.
    /// </summary>
    public class DeleteBlogCategoryCommandHandler : IRequestHandler<DeleteBlogCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<BlogCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteBlogCategoryCommandHandler(IGenericRepositoryAsync<BlogCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the BlogCategory from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteBlogCategoryCommand request, CancellationToken cancellationToken)
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
