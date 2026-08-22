using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageCategoryCommands
{
    /// <summary>
    /// Command to update an existing PageCategory.
    /// </summary>
    public sealed class UpdatePageCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdatePageCategoryCommand.
        /// </summary>
        public UpdatePageCategoryCommand(PageCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The PageCategory data to be updated.
        /// </summary>
        public PageCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdatePageCategoryCommand.
    /// </summary>
    public class UpdatePageCategoryCommandHandler : IRequestHandler<UpdatePageCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<PageCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdatePageCategoryCommandHandler(IGenericRepositoryAsync<PageCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the PageCategory in the database.
        /// </summary>
        public async Task<bool> Handle(UpdatePageCategoryCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
