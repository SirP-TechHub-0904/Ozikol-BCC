using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BlogCommands
{
    /// <summary>
    /// Command to create a new Blog.
    /// </summary>
    public sealed class CreateBlogCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateBlogCommand.
        /// </summary>
        public CreateBlogCommand(Blog data)
        {
            Data = data;
        }

        /// <summary>
        /// The Blog data to be created.
        /// </summary>
        public Blog Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateBlogCommand.
    /// </summary>
    public class CreateBlogCommandHandler : IRequestHandler<CreateBlogCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<Blog> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateBlogCommandHandler(IGenericRepositoryAsync<Blog> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the Blog to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateBlogCommand request, CancellationToken cancellationToken)
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
