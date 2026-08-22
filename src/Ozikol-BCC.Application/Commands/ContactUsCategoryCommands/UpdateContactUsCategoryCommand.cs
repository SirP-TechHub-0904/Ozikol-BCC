using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ContactUsCategoryCommands
{
    /// <summary>
    /// Command to update an existing ContactUsCategory.
    /// </summary>
    public sealed class UpdateContactUsCategoryCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateContactUsCategoryCommand.
        /// </summary>
        public UpdateContactUsCategoryCommand(ContactUsCategory data)
        {
            Data = data;
        }

        /// <summary>
        /// The ContactUsCategory data to be updated.
        /// </summary>
        public ContactUsCategory Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateContactUsCategoryCommand.
    /// </summary>
    public class UpdateContactUsCategoryCommandHandler : IRequestHandler<UpdateContactUsCategoryCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ContactUsCategory> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateContactUsCategoryCommandHandler(IGenericRepositoryAsync<ContactUsCategory> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the ContactUsCategory in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateContactUsCategoryCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
