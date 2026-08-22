using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.TemplateTypeCommands
{
    /// <summary>
    /// Command to update an existing TemplateType.
    /// </summary>
    public sealed class UpdateTemplateTypeCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateTemplateTypeCommand.
        /// </summary>
        public UpdateTemplateTypeCommand(TemplateType data)
        {
            Data = data;
        }

        /// <summary>
        /// The TemplateType data to be updated.
        /// </summary>
        public TemplateType Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateTemplateTypeCommand.
    /// </summary>
    public class UpdateTemplateTypeCommandHandler : IRequestHandler<UpdateTemplateTypeCommand, bool>
    {
        private readonly IGenericRepositoryAsync<TemplateType> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateTemplateTypeCommandHandler(IGenericRepositoryAsync<TemplateType> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the TemplateType in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateTemplateTypeCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
