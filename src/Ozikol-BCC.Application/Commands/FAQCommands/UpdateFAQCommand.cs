using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.FAQCommands
{
    /// <summary>
    /// Command to update an existing FAQ.
    /// </summary>
    public sealed class UpdateFAQCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateFAQCommand.
        /// </summary>
        public UpdateFAQCommand(FAQ data)
        {
            Data = data;
        }

        /// <summary>
        /// The FAQ data to be updated.
        /// </summary>
        public FAQ Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateFAQCommand.
    /// </summary>
    public class UpdateFAQCommandHandler : IRequestHandler<UpdateFAQCommand, bool>
    {
        private readonly IGenericRepositoryAsync<FAQ> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateFAQCommandHandler(IGenericRepositoryAsync<FAQ> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the FAQ in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateFAQCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
