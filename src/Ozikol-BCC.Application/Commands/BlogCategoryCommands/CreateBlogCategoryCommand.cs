using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BlogCategoryCommands
{
    /// <summary>
    /// Command to create a new BlogCategory.
    /// </summary>
    public sealed class CreateBlogCategoryCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateBlogCategoryCommand.
        /// </summary>
        public CreateBlogCategoryCommand(BlogCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The BlogCategory data to be created.
        /// </summary>
        public BlogCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateBlogCategoryCommand.
    /// </summary>
    public class CreateBlogCategoryCommandHandler : IRequestHandler<CreateBlogCategoryCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<BlogCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateBlogCategoryCommandHandler(IGenericRepositoryAsync<BlogCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the BlogCategory to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateBlogCategoryCommand request, CancellationToken cancellationToken)
        {
            // If the ID is empty, generate a new Guid
            if (request.Data.Id == Guid.Empty)
            {
                request.Data.Id = Guid.NewGuid();
            }

            await _repository.AddAsync(request.Data);
            return request.Data.Id;
        }
    }
}
