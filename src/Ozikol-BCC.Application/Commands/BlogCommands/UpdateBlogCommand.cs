using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BlogCommands
{
    /// <summary>
    /// Command to update an existing Blog.
    /// </summary>
    public sealed class UpdateBlogCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateBlogCommand.
        /// </summary>
        public UpdateBlogCommand(Blog data)
        {
            Data = data;
        }

        /// <summary>
        /// The Blog data to be updated.
        /// </summary>
        public Blog Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateBlogCommand.
    /// </summary>
    public class UpdateBlogCommandHandler : IRequestHandler<UpdateBlogCommand, bool>
    {
        private readonly IGenericRepositoryAsync<Blog> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateBlogCommandHandler(IGenericRepositoryAsync<Blog> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the Blog in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateBlogCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
