using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Ozikol_BCC.Api.Tests
{
    public static class TestJwtHelper
    {
        public static string GenerateTestJwtToken()
        {
            var jwtKey = Environment.GetEnvironmentVariable("Jwt__Key")
                ?? Environment.GetEnvironmentVariable("JWT_KEY")
                ?? "OzikolBCC_b8f4e2a91c6d3f7e0b5a8c2d4f9e1a3b5c7d9e0f2a4b6c8d0e2f4a6b8c0d2e4f";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, "usr_test_001"),
                new Claim(JwtRegisteredClaimNames.Email, "testuser@ozikol.com"),
                new Claim(ClaimTypes.NameIdentifier, "usr_test_001"),
                new Claim(ClaimTypes.Name, "Test User"),
                new Claim(ClaimTypes.Role, "SuperAdmin")
            };

            var token = new JwtSecurityToken(
                issuer: "Ozikol-BCC.Api",
                audience: "Ozikol-BCC.Client",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public static void AuthenticateClient(HttpClient client)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwtToken());
        }
    }
}
