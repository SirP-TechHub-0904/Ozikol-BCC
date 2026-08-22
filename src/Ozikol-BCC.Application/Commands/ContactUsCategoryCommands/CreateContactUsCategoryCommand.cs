using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ContactUsCategoryCommands
{
    /// <summary>
    /// Command to create a new ContactUsCategory.
    /// </summary>
    public sealed class CreateContactUsCategoryCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateContactUsCategoryCommand.
        /// </summary>
        public CreateContactUsCategoryCommand(ContactUsCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The ContactUsCategory data to be created.
        /// </summary>
        public ContactUsCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateContactUsCategoryCommand.
    /// </summary>
    public class CreateContactUsCategoryCommandHandler : IRequestHandler<CreateContactUsCategoryCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<ContactUsCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateContactUsCategoryCommandHandler(IGenericRepositoryAsync<ContactUsCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the ContactUsCategory to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateContactUsCategoryCommand request, CancellationToken cancellationToken)
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
