using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BlogCommands
{
    /// <summary>
    /// Command to delete a Blog by its ID.
    /// </summary>
    public sealed class DeleteBlogCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteBlogCommand.
        /// </summary>
        public DeleteBlogCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the Blog to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteBlogCommand.
    /// </summary>
    public class DeleteBlogCommandHandler : IRequestHandler<DeleteBlogCommand, bool>
    {
        private readonly IGenericRepositoryAsync<Blog> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteBlogCommandHandler(IGenericRepositoryAsync<Blog> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the Blog from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteBlogCommand request, CancellationToken cancellationToken)
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
