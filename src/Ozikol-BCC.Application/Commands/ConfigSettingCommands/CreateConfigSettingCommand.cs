using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.ConfigSettingCommands
{
    /// <summary>
    /// Command to create a new ConfigSetting.
    /// </summary>
    public sealed class CreateConfigSettingCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateConfigSettingCommand.
        /// </summary>
        public CreateConfigSettingCommand(ConfigSetting data)
        {
            Data = data;
        }

        /// <summary>
        /// The ConfigSetting data to be created.
        /// </summary>
        public ConfigSetting Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateConfigSettingCommand.
    /// </summary>
    public class CreateConfigSettingCommandHandler : IRequestHandler<CreateConfigSettingCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<ConfigSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateConfigSettingCommandHandler(IGenericRepositoryAsync<ConfigSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the ConfigSetting to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateConfigSettingCommand request, CancellationToken cancellationToken)
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
