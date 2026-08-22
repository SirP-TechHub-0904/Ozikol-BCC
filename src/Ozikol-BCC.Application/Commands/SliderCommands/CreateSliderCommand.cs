using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.SliderCommands
{
    /// <summary>
    /// Command to create a new Slider.
    /// </summary>
    public sealed class CreateSliderCommand : IRequest<Guid>
    {
        /// <summary>
        /// Initializes a new instance of the CreateSliderCommand.
        /// </summary>
        public CreateSliderCommand(Slider data)
        {
            Data = data;
        }

        /// <summary>
        /// The Slider data to be created.
        /// </summary>
        public Slider Data { get; set; }
    }

    /// <summary>
    /// Handler for the CreateSliderCommand.
    /// </summary>
    public class CreateSliderCommandHandler : IRequestHandler<CreateSliderCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<Slider> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public CreateSliderCommandHandler(IGenericRepositoryAsync<Slider> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to add the Slider to the database.
        /// </summary>
        public async Task<Guid> Handle(CreateSliderCommand request, CancellationToken cancellationToken)
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
