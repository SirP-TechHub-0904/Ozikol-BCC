using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ManagementSettingCommands
{
    /// <summary>
    /// Command to create a new ManagementSetting.
    /// </summary>
    public sealed class CreateManagementSettingCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateManagementSettingCommand.
        /// </summary>
        public CreateManagementSettingCommand(ManagementSetting data)
        {
            Data = data;
        }

        /// <summary>
        /// The ManagementSetting data to be created.
        /// </summary>
        public ManagementSetting Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateManagementSettingCommand.
    /// </summary>
    public class CreateManagementSettingCommandHandler : IRequestHandler<CreateManagementSettingCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<ManagementSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateManagementSettingCommandHandler(IGenericRepositoryAsync<ManagementSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the ManagementSetting to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateManagementSettingCommand request, CancellationToken cancellationToken)
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
