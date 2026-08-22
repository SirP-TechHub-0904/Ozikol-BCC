using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ContactUsCategoryCommands
{
    /// <summary>
    /// Command to delete a ContactUsCategory by its ID.
    /// </summary>
    public sealed class DeleteContactUsCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteContactUsCategoryCommand.
        /// </summary>
        public DeleteContactUsCategoryCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the ContactUsCategory to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteContactUsCategoryCommand.
    /// </summary>
    public class DeleteContactUsCategoryCommandHandler : IRequestHandler<DeleteContactUsCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ContactUsCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteContactUsCategoryCommandHandler(IGenericRepositoryAsync<ContactUsCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the ContactUsCategory from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteContactUsCategoryCommand request, CancellationToken cancellationToken)
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
