using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.WebPageCommands
{
    /// <summary>
    /// Command to update an existing WebPage.
    /// </summary>
    public sealed class UpdateWebPageCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateWebPageCommand.
        /// </summary>
        public UpdateWebPageCommand(WebPage data)
        {
            Data = data;
        }

        /// <summary>
        /// The WebPage data to be updated.
        /// </summary>
        public WebPage Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateWebPageCommand.
    /// </summary>
    public class UpdateWebPageCommandHandler : IRequestHandler<UpdateWebPageCommand, bool>
    {
        private readonly IGenericRepositoryAsync<WebPage> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateWebPageCommandHandler(IGenericRepositoryAsync<WebPage> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the WebPage in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateWebPageCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
