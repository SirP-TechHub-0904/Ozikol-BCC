using MediatR;
using Ozikol_BCC.Application.Services.Cloudinary;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.CloudinaryCommands
{
    public class DeleteImageCommand : IRequest<bool>
    {
        public string PublicId { get; set; }

        public DeleteImageCommand(string publicId)
        {
            PublicId = publicId;
        }
    }

    public class DeleteImageCommandHandler : IRequestHandler<DeleteImageCommand, bool>
    {
        private readonly ICloudinaryService _cloudinaryService;

        public DeleteImageCommandHandler(ICloudinaryService cloudinaryService)
        {
            _cloudinaryService = cloudinaryService;
        }

        public async Task<bool> Handle(DeleteImageCommand request, CancellationToken cancellationToken)
        {
            return await _cloudinaryService.DeleteImageAsync(request.PublicId);
        }
    }
}
