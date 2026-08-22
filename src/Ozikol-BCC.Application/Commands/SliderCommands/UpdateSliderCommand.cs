using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.SliderCommands
{
    /// <summary>
    /// Command to update an existing Slider.
    /// </summary>
    public sealed class UpdateSliderCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the UpdateSliderCommand.
        /// </summary>
        public UpdateSliderCommand(Slider data)
        {
            Data = data;
        }

        /// <summary>
        /// The Slider data to be updated.
        /// </summary>
        public Slider Data { get; set; }
    }

    /// <summary>
    /// Handler for the UpdateSliderCommand.
    /// </summary>
    public class UpdateSliderCommandHandler : IRequestHandler<UpdateSliderCommand, bool>
    {
        private readonly IGenericRepositoryAsync<Slider> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public UpdateSliderCommandHandler(IGenericRepositoryAsync<Slider> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to update the Slider in the database.
        /// </summary>
        public async Task<bool> Handle(UpdateSliderCommand request, CancellationToken cancellationToken)
        {
            await _repository.UpdateAsync(request.Data);
            return true;
        }
    }
}
