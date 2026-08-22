using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageSectionListCommands
{
    /// <summary>
    /// Command to update an existing PageSectionList.
    /// </summary>
    public sealed class UpdatePageSectionListCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdatePageSectionListCommand.
        /// </summary>
        public UpdatePageSectionListCommand(PageSectionList data)
        {
            Data = data;
        }

        /// <summary>
        /// The PageSectionList data to be updated.
        /// </summary>
        public PageSectionList Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdatePageSectionListCommand.
    /// </summary>
    public class UpdatePageSectionListCommandHandler : IRequestHandler<UpdatePageSectionListCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PageSectionList> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdatePageSectionListCommandHandler(IGenericRepositoryAsync<PageSectionList> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the PageSectionList in the database.
        /// </summary>
        public async Task<bool> Handle(UpdatePageSectionListCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
