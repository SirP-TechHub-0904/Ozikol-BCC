using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PostModalCommands
{
    /// <summary>
    /// Command to update an existing PostModal.
    /// </summary>
    public sealed class UpdatePostModalCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdatePostModalCommand.
        /// </summary>
        public UpdatePostModalCommand(PostModal data)
        {
            Data = data;
        }

        /// <summary>
        /// The PostModal data to be updated.
        /// </summary>
        public PostModal Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdatePostModalCommand.
    /// </summary>
    public class UpdatePostModalCommandHandler : IRequestHandler<UpdatePostModalCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PostModal> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdatePostModalCommandHandler(IGenericRepositoryAsync<PostModal> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the PostModal in the database.
        /// </summary>
        public async Task<bool> Handle(UpdatePostModalCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
