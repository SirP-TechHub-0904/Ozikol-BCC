using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpReportParticipant
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpReportSchemaId { get; set; }
        public BcpReportSchema? BcpReportSchema { get; set; }

        [Required]
        public string? UserProfileId { get; set; }
        public Profile? UserProfile { get; set; }
    }
}


