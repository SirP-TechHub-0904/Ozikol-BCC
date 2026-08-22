using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.TemplateCategoryCommands
{
    /// <summary>
    /// Command to delete a TemplateCategory by its ID.
    /// </summary>
    public sealed class DeleteTemplateCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteTemplateCategoryCommand.
        /// </summary>
        public DeleteTemplateCategoryCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the TemplateCategory to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteTemplateCategoryCommand.
    /// </summary>
    public class DeleteTemplateCategoryCommandHandler : IRequestHandler<DeleteTemplateCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<TemplateCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteTemplateCategoryCommandHandler(IGenericRepositoryAsync<TemplateCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the TemplateCategory from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteTemplateCategoryCommand request, CancellationToken cancellationToken)
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
