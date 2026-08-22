using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.PageCategoryCommands
{
    /// <summary>
    /// Command to create a new PageCategory.
    /// </summary>
    public sealed class CreatePageCategoryCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreatePageCategoryCommand.
        /// </summary>
        public CreatePageCategoryCommand(PageCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The PageCategory data to be created.
        /// </summary>
        public PageCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreatePageCategoryCommand.
    /// </summary>
    public class CreatePageCategoryCommandHandler : IRequestHandler<CreatePageCategoryCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<PageCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreatePageCategoryCommandHandler(IGenericRepositoryAsync<PageCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the PageCategory to the database.
        /// </summary>
        public async Task<Guid> Handle(CreatePageCategoryCommand request, CancellationToken cancellationToken)
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
