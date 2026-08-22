using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PostModalCommands
{
    /// <summary>
    /// Command to create a new PostModal.
    /// </summary>
    public sealed class CreatePostModalCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreatePostModalCommand.
        /// </summary>
        public CreatePostModalCommand(PostModal data)
        {
            Data = data;
        }

        /// <summary>
        /// The PostModal data to be created.
        /// </summary>
        public PostModal Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreatePostModalCommand.
    /// </summary>
    public class CreatePostModalCommandHandler : IRequestHandler<CreatePostModalCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<PostModal> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreatePostModalCommandHandler(IGenericRepositoryAsync<PostModal> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the PostModal to the database.
        /// </summary>
        public async Task<Guid> Handle(CreatePostModalCommand request, CancellationToken cancellationToken)
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
