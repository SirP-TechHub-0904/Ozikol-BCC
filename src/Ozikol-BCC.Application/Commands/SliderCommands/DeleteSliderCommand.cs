using MediatR;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Application.Repository.Base;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.SliderCommands
{
    /// <summary>
    /// Command to delete a Slider by its ID.
    /// </summary>
    public sealed class DeleteSliderCommand : IRequest<bool>
    {
        /// <summary>
        /// Initializes a new instance of the DeleteSliderCommand.
        /// </summary>
        public DeleteSliderCommand(Guid id)
        {
            Id = id;
        }

        /// <summary>
        /// The unique Guid identifier of the Slider to delete.
        /// </summary>
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Handler for the DeleteSliderCommand.
    /// </summary>
    public class DeleteSliderCommandHandler : IRequestHandler<DeleteSliderCommand, bool>
    {
        private readonly IGenericRepositoryAsync<Slider> _repository;

        /// <summary>
        /// Constructor injected with the generic repository.
        /// </summary>
        public DeleteSliderCommandHandler(IGenericRepositoryAsync<Slider> repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Executes the command to delete the Slider from the database.
        /// </summary>
        public async Task<bool> Handle(DeleteSliderCommand request, CancellationToken cancellationToken)
        {
            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity != null)
            {
                await _repository.DeleteAsync(entity);
                return true;
            }
            return false; // Not found
        }
    }
}
