using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A project work item that can be assigned to a Profile and optionally planned
    /// inside a sprint. Status, priority, and type drive the project dashboard.
    /// </summary>
    public class BcpProjectTask
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpProjectId { get; set; }
        public BcpProject? BcpProject { get; set; }

        public Guid? BcpProjectSprintId { get; set; }
        public BcpProjectSprint? BcpProjectSprint { get; set; }

        /// <summary>
        /// Optional assignee. Null means the task is unassigned but still belongs to the project.
        /// </summary>
        public string? AssignedToUserId { get; set; }
        public Profile? AssignedToUser { get; set; }

        [Required, StringLength(255)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        public Enum.Enum.BcpTaskType Type { get; set; } = Enum.Enum.BcpTaskType.Task;
        
        public Enum.Enum.BcpTaskStatus Status { get; set; } = Enum.Enum.BcpTaskStatus.ToDo;

        public Enum.Enum.BcpTaskPriority Priority { get; set; } = Enum.Enum.BcpTaskPriority.Medium;

        public int StoryPoints { get; set; } = 0;

        public DateTime? DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


