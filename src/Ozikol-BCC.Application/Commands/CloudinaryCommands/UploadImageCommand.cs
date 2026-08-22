using MediatR;
using Microsoft.AspNetCore.Http;
using Ozikol_BCC.Application.Services.Cloudinary;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Commands.CloudinaryCommands
{
    public class UploadImageCommand : IRequest<string>
    {
        public IFormFile File { get; set; }
        public string FolderName { get; set; } = "templates";

        public UploadImageCommand(IFormFile file, string folderName = "templates")
        {
            File = file;
            FolderName = folderName;
        }
    }

    public class UploadImageCommandHandler : IRequestHandler<UploadImageCommand, string>
    {
        private readonly ICloudinaryService _cloudinaryService;

        public UploadImageCommandHandler(ICloudinaryService cloudinaryService)
        {
            _cloudinaryService = cloudinaryService;
        }

        public async Task<string> Handle(UploadImageCommand request, CancellationToken cancellationToken)
        {
            return await _cloudinaryService.UploadImageAsync(request.File, request.FolderName);
        }
    }
}
