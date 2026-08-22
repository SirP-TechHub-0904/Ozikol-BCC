using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageSectionCommands
{
    /// <summary>
    /// Command to update an existing PageSection.
    /// </summary>
    public sealed class UpdatePageSectionCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdatePageSectionCommand.
        /// </summary>
        public UpdatePageSectionCommand(PageSection data)
        {
            Data = data;
        }

        /// <summary>
        /// The PageSection data to be updated.
        /// </summary>
        public PageSection Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdatePageSectionCommand.
    /// </summary>
    public class UpdatePageSectionCommandHandler : IRequestHandler<UpdatePageSectionCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PageSection> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdatePageSectionCommandHandler(IGenericRepositoryAsync<PageSection> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the PageSection in the database.
        /// </summary>
        public async Task<bool> Handle(UpdatePageSectionCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
