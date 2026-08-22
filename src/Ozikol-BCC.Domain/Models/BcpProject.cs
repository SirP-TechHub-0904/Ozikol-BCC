using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// BCP project aggregate. It connects project metadata to sprints, tasks,
    /// and assigned users so each project feature dashboard can report progress.
    /// </summary>
    public class BcpProject
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required, StringLength(200)]
        public string? Name { get; set; }

        public string? Description { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public Enum.Enum.BcpProjectStatus Status { get; set; } = Enum.Enum.BcpProjectStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Agile time boxes or delivery phases under this project.
        /// </summary>
        public ICollection<BcpProjectSprint> Sprints { get; set; } = new List<BcpProjectSprint>();

        /// <summary>
        /// Work items that belong to this project. Tasks may optionally be grouped under a sprint.
        /// </summary>
        public ICollection<BcpProjectTask> Tasks { get; set; } = new List<BcpProjectTask>();

        /// <summary>
        /// Users assigned to this project. Their actual account record remains Profile.
        /// </summary>
        public ICollection<BcpProjectUser> ProjectUsers { get; set; } = new List<BcpProjectUser>();
    }
}


