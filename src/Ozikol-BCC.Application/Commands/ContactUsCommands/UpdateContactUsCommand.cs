using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ContactUsCommands
{
    /// <summary>
    /// Command to update an existing ContactUs.
    /// </summary>
    public sealed class UpdateContactUsCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateContactUsCommand.
        /// </summary>
        public UpdateContactUsCommand(ContactUs data)
        {
            Data = data;
        }

        /// <summary>
        /// The ContactUs data to be updated.
        /// </summary>
        public ContactUs Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateContactUsCommand.
    /// </summary>
    public class UpdateContactUsCommandHandler : IRequestHandler<UpdateContactUsCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ContactUs> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateContactUsCommandHandler(IGenericRepositoryAsync<ContactUs> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the ContactUs in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateContactUsCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
