using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.NewsLetterCommands
{
    /// <summary>
    /// Command to update an existing NewsLetter.
    /// </summary>
    public sealed class UpdateNewsLetterCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateNewsLetterCommand.
        /// </summary>
        public UpdateNewsLetterCommand(NewsLetter data)
        {
            Data = data;
        }

        /// <summary>
        /// The NewsLetter data to be updated.
        /// </summary>
        public NewsLetter Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateNewsLetterCommand.
    /// </summary>
    public class UpdateNewsLetterCommandHandler : IRequestHandler<UpdateNewsLetterCommand, bool>
    {
        private readonly IGenericRepositoryAsync<NewsLetter> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateNewsLetterCommandHandler(IGenericRepositoryAsync<NewsLetter> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the NewsLetter in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateNewsLetterCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
