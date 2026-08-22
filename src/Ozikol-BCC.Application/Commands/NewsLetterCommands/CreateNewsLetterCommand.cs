using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.NewsLetterCommands
{
    /// <summary>
    /// Command to create a new NewsLetter.
    /// </summary>
    public sealed class CreateNewsLetterCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateNewsLetterCommand.
        /// </summary>
        public CreateNewsLetterCommand(NewsLetter data)
        {
            Data = data;
        }

        /// <summary>
        /// The NewsLetter data to be created.
        /// </summary>
        public NewsLetter Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateNewsLetterCommand.
    /// </summary>
    public class CreateNewsLetterCommandHandler : IRequestHandler<CreateNewsLetterCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<NewsLetter> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateNewsLetterCommandHandler(IGenericRepositoryAsync<NewsLetter> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the NewsLetter to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateNewsLetterCommand request, CancellationToken cancellationToken)
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
