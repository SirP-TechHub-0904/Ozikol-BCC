using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.TemplateCategoryCommands
{
    /// <summary>
    /// Command to create a new TemplateCategory.
    /// </summary>
    public sealed class CreateTemplateCategoryCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateTemplateCategoryCommand.
        /// </summary>
        public CreateTemplateCategoryCommand(TemplateCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The TemplateCategory data to be created.
        /// </summary>
        public TemplateCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateTemplateCategoryCommand.
    /// </summary>
    public class CreateTemplateCategoryCommandHandler : IRequestHandler<CreateTemplateCategoryCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<TemplateCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateTemplateCategoryCommandHandler(IGenericRepositoryAsync<TemplateCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the TemplateCategory to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateTemplateCategoryCommand request, CancellationToken cancellationToken)
        {
            // If the ID is empty, generate a new Guid
            if (request.Data.Id == Guid.Empty)
            {
                request.Data.Id = Guid.NewGuid();
            }

            await _repository.AddAsync(request.Data);
            return request.Data.Id;
        }
    }
}
