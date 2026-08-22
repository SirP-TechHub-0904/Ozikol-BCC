using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.BcpSettingCommands
{
    /// <summary>
    /// Command to create a new BcpSetting.
    /// </summary>
    public sealed class CreateBcpSettingCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateBcpSettingCommand.
        /// </summary>
        public CreateBcpSettingCommand(BcpSetting data)
        {
            Data = data;
        }

        /// <summary>
        /// The BcpSetting data to be created.
        /// </summary>
        public BcpSetting Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateBcpSettingCommand.
    /// </summary>
    public class CreateBcpSettingCommandHandler : IRequestHandler<CreateBcpSettingCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<BcpSetting> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateBcpSettingCommandHandler(IGenericRepositoryAsync<BcpSetting> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the BcpSetting to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateBcpSettingCommand request, CancellationToken cancellationToken)
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
