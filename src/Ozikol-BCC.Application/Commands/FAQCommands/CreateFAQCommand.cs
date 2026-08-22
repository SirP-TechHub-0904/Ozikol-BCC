using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.FAQCommands
{
    /// <summary>
    /// Command to create a new FAQ.
    /// </summary>
    public sealed class CreateFAQCommand : IRequest<int>
    {
        /// <summary>
        /// Initializes a new instance of the CreateFAQCommand.
        /// </summary>
        public CreateFAQCommand(FAQ data)
        {
            Data = data;
        }

        /// <summary>
        /// The FAQ data to be created.
        /// </summary>
        public FAQ Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateFAQCommand.
    /// </summary>
    public class CreateFAQCommandHandler : IRequestHandler<CreateFAQCommand, int>
    {
        private readonly IGenericRepositoryAsync<FAQ> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateFAQCommandHandler(IGenericRepositoryAsync<FAQ> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the FAQ to the database.
        /// </summary>
        public async Task<int> Handle(CreateFAQCommand request, CancellationToken cancellationToken)
        {
            // If the ID is empty, generate a new Guid
            if (request.Data.Id == 0)
            {
                
            }

            await _repository.AddAsync(request.Data);
            return request.Data.Id;
        }
    }
}
