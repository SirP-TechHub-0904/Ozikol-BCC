using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BlogCategoryCommands
{
    /// <summary>
    /// Command to update an existing BlogCategory.
    /// </summary>
    public sealed class UpdateBlogCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateBlogCategoryCommand.
        /// </summary>
        public UpdateBlogCategoryCommand(BlogCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The BlogCategory data to be updated.
        /// </summary>
        public BlogCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateBlogCategoryCommand.
    /// </summary>
    public class UpdateBlogCategoryCommandHandler : IRequestHandler<UpdateBlogCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<BlogCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateBlogCategoryCommandHandler(IGenericRepositoryAsync<BlogCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the BlogCategory in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateBlogCategoryCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
