using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProjectSprint
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpProjectId { get; set; }
        public BcpProject? BcpProject { get; set; }

        [Required, StringLength(100)]
        public string? SprintName { get; set; }

        public string? Goal { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public Enum.Enum.BcpSprintStatus Status { get; set; } = Enum.Enum.BcpSprintStatus.Planned;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public ICollection<BcpProjectTask> Tasks { get; set; } = new List<BcpProjectTask>();
    }
}


