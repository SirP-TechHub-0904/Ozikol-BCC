using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.TemplateTypeCommands
{
    /// <summary>
    /// Command to delete a TemplateType by its ID.
    /// </summary>
    public sealed class DeleteTemplateTypeCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteTemplateTypeCommand.
        /// </summary>
        public DeleteTemplateTypeCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the TemplateType to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteTemplateTypeCommand.
    /// </summary>
    public class DeleteTemplateTypeCommandHandler : IRequestHandler<DeleteTemplateTypeCommand, bool>
    {
        private readonly IGenericRepositoryAsync<TemplateType> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteTemplateTypeCommandHandler(IGenericRepositoryAsync<TemplateType> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the TemplateType from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteTemplateTypeCommand request, CancellationToken cancellationToken)
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
