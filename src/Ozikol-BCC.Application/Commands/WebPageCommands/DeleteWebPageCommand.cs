using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.WebPageCommands
{
    /// <summary>
    /// Command to delete a WebPage by its ID.
    /// </summary>
    public sealed class DeleteWebPageCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteWebPageCommand.
        /// </summary>
        public DeleteWebPageCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the WebPage to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteWebPageCommand.
    /// </summary>
    public class DeleteWebPageCommandHandler : IRequestHandler<DeleteWebPageCommand, bool>
    {
        private readonly IGenericRepositoryAsync<WebPage> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteWebPageCommandHandler(IGenericRepositoryAsync<WebPage> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the WebPage from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteWebPageCommand request, CancellationToken cancellationToken)
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
