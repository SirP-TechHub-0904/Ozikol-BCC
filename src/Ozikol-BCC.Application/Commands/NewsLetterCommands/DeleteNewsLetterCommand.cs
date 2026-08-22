using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.NewsLetterCommands
{
    /// <summary>
    /// Command to delete a NewsLetter by its ID.
    /// </summary>
    public sealed class DeleteNewsLetterCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteNewsLetterCommand.
        /// </summary>
        public DeleteNewsLetterCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the NewsLetter to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteNewsLetterCommand.
    /// </summary>
    public class DeleteNewsLetterCommandHandler : IRequestHandler<DeleteNewsLetterCommand, bool>
    {
        private readonly IGenericRepositoryAsync<NewsLetter> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteNewsLetterCommandHandler(IGenericRepositoryAsync<NewsLetter> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the NewsLetter from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteNewsLetterCommand request, CancellationToken cancellationToken)
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
