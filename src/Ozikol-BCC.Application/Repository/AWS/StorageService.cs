using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Ozikol_BCC.Application.Dtos.AwsDtos;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.AccessControl;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services.AWS
{
    public class StorageService : IStorageService
    {
        private readonly IConfiguration _config;
        private readonly DashboardDbContext _context;

        //private readonly IAmazonS3 _client;
        public StorageService(IConfiguration config/*, IAmazonS3 client*/, DashboardDbContext context)
        {
            _config = config;
            _context = context;
            //_client = client;
        }

        public async Task<S3ResponseDto> UploadFileAsync(Application.Dtos.AwsDtos.S3Object obj, AwsCredentials awsCredentialsValues)
        {
            //var awsCredentialsValues = _config.ReadS3Credentials();
            ////
            // Console.WriteLine($"Key: {awsCredentialsValues.AccessKey}, Secret: {awsCredentialsValues.SecretKey}");

            var credentials = new BasicAWSCredentials(awsCredentialsValues.AccessKey, awsCredentialsValues.SecretKey);

            var config = new AmazonS3Config()
            {
                RegionEndpoint = Amazon.RegionEndpoint.USEast1
            };

            var response = new S3ResponseDto();
            try
            {
                var uploadRequest = new TransferUtilityUploadRequest()
                {
                    InputStream = obj.InputStream,
                    Key = obj.Name,
                    BucketName = obj.BucketName,
                    CannedACL = S3CannedACL.NoACL
                };

                // initialise client
                using var client = new AmazonS3Client(credentials, config);

                // initialise the transfer/upload tools
                var transferUtility = new TransferUtility(client);

                // initiate the file upload
                await transferUtility.UploadAsync(uploadRequest);

                response.StatusCode = 201;
                response.Message = $"{obj.Name} has been uploaded sucessfully";
            }
            catch (AmazonS3Exception s3Ex)
            {
                response.StatusCode = (int)s3Ex.StatusCode;
                response.Message = s3Ex.Message;
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<string> DownloadFileAsync(string file, string bucketName, AwsCredentials awsCredentialsValues)
        {


            var credentials = new BasicAWSCredentials(awsCredentialsValues.AccessKey, awsCredentialsValues.SecretKey);

            var config = new AmazonS3Config()
            {
                RegionEndpoint = Amazon.RegionEndpoint.USEast1
            };

            //var response = new S3ResponseDto();
            Stream rs;
            var request = new GetObjectRequest
            {
                BucketName = bucketName,
                Key = file,
            };

            var preurl = new GetPreSignedUrlRequest
            {
                BucketName = bucketName,
                Key = file,
                Expires = DateTime.UtcNow.AddYears(3)
            };
            using var client = new AmazonS3Client(credentials, config);
            var url = client.GetPreSignedURL(preurl);

            return url;
        }

        public async Task<FileReturnResponseDto> UploadFileReturnUrlAsync(Ozikol_BCC.Application.Dtos.AwsDtos.S3Object obj, AwsCredentials awsCredentialsValues, string old_key)
        {
            var credentials = new BasicAWSCredentials(awsCredentialsValues.AccessKey, awsCredentialsValues.SecretKey);

            var config = new AmazonS3Config()
            {
                RegionEndpoint = Amazon.RegionEndpoint.USEast1
            };
            var response = new FileReturnResponseDto();
            // initialise client
            using var client = new AmazonS3Client(credentials, config);
            if (!String.IsNullOrEmpty(old_key))
            {
                try
                {
                    //delete object
                    var deleteObjectRequest = new DeleteObjectRequest
                    {
                        BucketName = obj.BucketName,
                        Key = old_key
                    };

                    Console.WriteLine("Deleting an object");
                    await client.DeleteObjectAsync(deleteObjectRequest);
                }
                catch (AmazonS3Exception e)
                {
                    Console.WriteLine("Error encountered on server. Message:'{0}' when deleting an object", e.Message);
                }
                catch (Exception c)
                {

                }
            }
            try
            {
                var uploadRequest = new TransferUtilityUploadRequest()
                {
                    InputStream = obj.InputStream,
                    Key = obj.Name,
                    BucketName = obj.BucketName,
                    CannedACL = S3CannedACL.NoACL
                };


                // initialise the transfer/upload tools
                var transferUtility = new TransferUtility(client);

                // initiate the file upload
                await transferUtility.UploadAsync(uploadRequest);

                //response.StatusCode = 201;
                //response.Message = $"{obj.Name} has been uploaded sucessfully";

                var request = new GetObjectRequest
                {
                    BucketName = obj.BucketName,
                    Key = "obj.Name",
                };

                var preurl = new GetPreSignedUrlRequest
                {
                    BucketName = obj.BucketName,
                    Key = obj.Name,
                    Expires = DateTime.UtcNow.AddYears(3)
                };

                var url = client.GetPreSignedURL(preurl);
                response.Message = "200";
                response.Key = obj.Name;
                response.Url = url;
                return response;

            }
            catch (AmazonS3Exception s3Ex)
            {
                response.Message = s3Ex.StatusCode.ToString() + "<br>" + s3Ex.Message;


            }
            catch (Exception ex)
            {
                response.Message = "error 500 <br>" + ex.Message;
            }
            return response;
        }

        public async Task<FileReturnResponseDto> DeleteObjectAsync(AwsCredentials awsCredentialsValues, string bucket, string key)
        {

            var credentials = new BasicAWSCredentials(awsCredentialsValues.AccessKey, awsCredentialsValues.SecretKey);

            var config = new AmazonS3Config()
            {
                RegionEndpoint = Amazon.RegionEndpoint.USEast1
            };
            var response = new FileReturnResponseDto();
            // initialise client
            using var client = new AmazonS3Client(credentials, config);

            try
            {
                //delete object
                var deleteObjectRequest = new DeleteObjectRequest
                {
                    BucketName = bucket,
                    Key = key
                };

                //Console.WriteLine("Deleting an object");
                await client.DeleteObjectAsync(deleteObjectRequest);
                response.Message = "200";
            }
            catch (AmazonS3Exception e)
            {
                //Console.WriteLine("Error encountered on server. Message:'{0}' when deleting an object", e.Message);
            }
            catch (Exception c)
            {

            }
            return response;


        }

        public async Task<FileReturnResponseDto> MainUploadFileReturnUrlAsync(string old_key, IFormFile? file)
        {
            var response = new FileReturnResponseDto();
            if (file != null)
            {
                await using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);

                var fileExt = Path.GetExtension(file.FileName);
                var docName = $"{Guid.NewGuid()}{fileExt}";
                // call server

                var s3Obj = new Application.Dtos.AwsDtos.S3Object()
                {
                    BucketName = await BucketName(),
                    InputStream = memoryStream,
                    Name = docName
                };

                var cred = new AwsCredentials()
                {
                    AccessKey = _config["AwsConfiguration:AWSAccessKey"],
                    SecretKey = _config["AwsConfiguration:AWSSecretKey"]
                };
                var credentials = new BasicAWSCredentials(cred.AccessKey, cred.SecretKey);

                var config = new AmazonS3Config()
                {
                    RegionEndpoint = Amazon.RegionEndpoint.USEast1
                };

                // initialise client
                using var client = new AmazonS3Client(credentials, config);
                if (!String.IsNullOrEmpty(old_key))
                {
                    try
                    {
                        //delete object
                        var deleteObjectRequest = new DeleteObjectRequest
                        {
                            BucketName = s3Obj.BucketName,
                            Key = old_key
                        };

                        Console.WriteLine("Deleting an object");
                        await client.DeleteObjectAsync(deleteObjectRequest);
                    }
                    catch (AmazonS3Exception e)
                    {
                        Console.WriteLine("Error encountered on server. Message:'{0}' when deleting an object", e.Message);
                    }
                    catch (Exception c)
                    {

                    }
                }
                try
                {
                    var uploadRequest = new TransferUtilityUploadRequest()
                    {
                        InputStream = s3Obj.InputStream,
                        Key = s3Obj.Name,
                        BucketName = s3Obj.BucketName,
                        CannedACL = S3CannedACL.NoACL
                    };


                    // initialise the transfer/upload tools
                    var transferUtility = new TransferUtility(client);

                    // initiate the file upload
                    await transferUtility.UploadAsync(uploadRequest);

                    //response.StatusCode = 201;
                    //response.Message = $"{obj.Name} has been uploaded sucessfully";

                    var request = new GetObjectRequest
                    {
                        BucketName = s3Obj.BucketName,
                        Key = "obj.Name",
                    };

                    var preurl = new GetPreSignedUrlRequest
                    {
                        BucketName = s3Obj.BucketName,
                        Key = s3Obj.Name,
                        Expires = DateTime.UtcNow.AddYears(3)
                    };

                    var url = client.GetPreSignedURL(preurl);
                    response.Message = "200";
                    response.Key = s3Obj.Name;
                    response.Url = url;
                    return response;

                }
                catch (AmazonS3Exception s3Ex)
                {
                    response.Message = s3Ex.StatusCode.ToString() + "<br>" + s3Ex.Message;


                }
                catch (Exception ex)
                {
                    response.Message = "error 500 <br>" + ex.Message;
                }
                return response;
            }
            response.Message = "error 500 file empty";
            return response;
        }
        public async Task<string> MoveImageAndGetPresignedUrlAsync(string imageKey)
        {
            // 1. Determine new bucket name from DB or fallback to default
            var newBucket = await BucketName(); // From your DB, or default

            // 2. Set old bucket name (hardcoded default)
            var oldBucket = "juray2023";

            // 3. AWS Credentials
            var cred = new AwsCredentials()
            {
                AccessKey = _config["AwsConfiguration:AWSAccessKey"],
                SecretKey = _config["AwsConfiguration:AWSSecretKey"]
            };
            var credentials = new BasicAWSCredentials(cred.AccessKey, cred.SecretKey);

            var config = new AmazonS3Config()
            {
                RegionEndpoint = Amazon.RegionEndpoint.USEast1
            };

            using var client = new AmazonS3Client(credentials, config);

            // 4. Copy the object from old bucket to new bucket
            var copyRequest = new CopyObjectRequest
            {
                SourceBucket = oldBucket,
                SourceKey = imageKey,
                DestinationBucket = newBucket,
                DestinationKey = imageKey,
                CannedACL = S3CannedACL.NoACL
            };

            await client.CopyObjectAsync(copyRequest);

            // 5. Delete the object from the old bucket (optional)
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = oldBucket,
                Key = imageKey
            };
            await client.DeleteObjectAsync(deleteRequest);

            // 6. Generate presigned URL for the object in the new bucket
            var preurl = new GetPreSignedUrlRequest
            {
                BucketName = newBucket,
                Key = imageKey,
                Expires = DateTime.UtcNow.AddYears(3)
            };
            var url = client.GetPreSignedURL(preurl);

            return url;
        }
                public Task<string> BucketName()
        {
            return Task.FromResult("juray2023");
        }

        public async Task<FileReturnResponseDto> GetUrlAsync(AwsCredentials awsCredentialsValues, string key)
        {
            var credentials = new BasicAWSCredentials(awsCredentialsValues.AccessKey, awsCredentialsValues.SecretKey);

            var config = new AmazonS3Config()
            {
                RegionEndpoint = Amazon.RegionEndpoint.USEast1
            };
            var response = new FileReturnResponseDto();
            // initialise client
            using var client = new AmazonS3Client(credentials, config);

            var preurl = new GetPreSignedUrlRequest
            {
                BucketName = await BucketName(),
                Key = key,
                Expires = DateTime.UtcNow.AddYears(3)
            };

            var url = client.GetPreSignedURL(preurl);
            response.Message = "200";
            response.Key = key;
            response.Url = url;
            return response;
        }
    }
}

