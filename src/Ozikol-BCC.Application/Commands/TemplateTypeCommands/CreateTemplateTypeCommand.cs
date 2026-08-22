using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.TemplateTypeCommands
{
    /// <summary>
    /// Command to create a new TemplateType.
    /// </summary>
    public sealed class CreateTemplateTypeCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateTemplateTypeCommand.
        /// </summary>
        public CreateTemplateTypeCommand(TemplateType data)
        {
            Data = data;
        }

        /// <summary>
        /// The TemplateType data to be created.
        /// </summary>
        public TemplateType Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateTemplateTypeCommand.
    /// </summary>
    public class CreateTemplateTypeCommandHandler : IRequestHandler<CreateTemplateTypeCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<TemplateType> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateTemplateTypeCommandHandler(IGenericRepositoryAsync<TemplateType> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the TemplateType to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateTemplateTypeCommand request, CancellationToken cancellationToken)
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
