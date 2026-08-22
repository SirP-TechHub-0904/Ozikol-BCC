using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.TemplateCategoryCommands
{
    /// <summary>
    /// Command to update an existing TemplateCategory.
    /// </summary>
    public sealed class UpdateTemplateCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateTemplateCategoryCommand.
        /// </summary>
        public UpdateTemplateCategoryCommand(TemplateCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The TemplateCategory data to be updated.
        /// </summary>
        public TemplateCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateTemplateCategoryCommand.
    /// </summary>
    public class UpdateTemplateCategoryCommandHandler : IRequestHandler<UpdateTemplateCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<TemplateCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateTemplateCategoryCommandHandler(IGenericRepositoryAsync<TemplateCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the TemplateCategory in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateTemplateCategoryCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
