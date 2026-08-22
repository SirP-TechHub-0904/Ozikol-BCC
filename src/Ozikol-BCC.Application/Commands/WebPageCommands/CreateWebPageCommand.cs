using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.WebPageCommands
{
    /// <summary>
    /// Command to create a new WebPage.
    /// </summary>
    public sealed class CreateWebPageCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateWebPageCommand.
        /// </summary>
        public CreateWebPageCommand(WebPage data)
        {
            Data = data;
        }

        /// <summary>
        /// The WebPage data to be created.
        /// </summary>
        public WebPage Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateWebPageCommand.
    /// </summary>
    public class CreateWebPageCommandHandler : IRequestHandler<CreateWebPageCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<WebPage> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateWebPageCommandHandler(IGenericRepositoryAsync<WebPage> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the WebPage to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateWebPageCommand request, CancellationToken cancellationToken)
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
