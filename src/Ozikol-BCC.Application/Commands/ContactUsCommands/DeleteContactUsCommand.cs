using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ContactUsCommands
{
    /// <summary>
    /// Command to delete a ContactUs by its ID.
    /// </summary>
    public sealed class DeleteContactUsCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteContactUsCommand.
        /// </summary>
        public DeleteContactUsCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the ContactUs to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteContactUsCommand.
    /// </summary>
    public class DeleteContactUsCommandHandler : IRequestHandler<DeleteContactUsCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ContactUs> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteContactUsCommandHandler(IGenericRepositoryAsync<ContactUs> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the ContactUs from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteContactUsCommand request, CancellationToken cancellationToken)
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
