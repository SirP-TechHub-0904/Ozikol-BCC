using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ContactUsCommands
{
    /// <summary>
    /// Command to create a new ContactUs.
    /// </summary>
    public sealed class CreateContactUsCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateContactUsCommand.
        /// </summary>
        public CreateContactUsCommand(ContactUs data)
        {
            Data = data;
        }

        /// <summary>
        /// The ContactUs data to be created.
        /// </summary>
        public ContactUs Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateContactUsCommand.
    /// </summary>
    public class CreateContactUsCommandHandler : IRequestHandler<CreateContactUsCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<ContactUs> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateContactUsCommandHandler(IGenericRepositoryAsync<ContactUs> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the ContactUs to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateContactUsCommand request, CancellationToken cancellationToken)
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
