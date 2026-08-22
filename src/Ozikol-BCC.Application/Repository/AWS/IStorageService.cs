using Ozikol_BCC.Application.Dtos.AwsDtos;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services.AWS
{
   /// <summary>
   /// Storage abstraction for S3-compatible file operations. Callers provide tenant/settings
   /// credentials so upload, delete, and signed URL behavior stays environment-specific.
   /// </summary>
   public interface IStorageService
    {
        Task<S3ResponseDto> UploadFileAsync(S3Object obj, AwsCredentials awsCredentialsValues);
        Task<FileReturnResponseDto> UploadFileReturnUrlAsync(S3Object obj, AwsCredentials awsCredentialsValues, string old_key);
        Task<FileReturnResponseDto> GetUrlAsync(AwsCredentials awsCredentialsValues, string key);
        Task<FileReturnResponseDto> MainUploadFileReturnUrlAsync(string old_key, IFormFile? file);
        Task<FileReturnResponseDto> DeleteObjectAsync(AwsCredentials awsCredentialsValues, string bucket, string key);
        Task<string> DownloadFileAsync(string file, string bucketName, AwsCredentials awsCredentialsValues);
        Task<string> MoveImageAndGetPresignedUrlAsync(string imageKey);
        Task<string> BucketName();
    }
}

