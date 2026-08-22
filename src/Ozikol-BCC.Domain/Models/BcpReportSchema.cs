using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpReportSchema
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(200)]
        public string? Name { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [Required]
        public string? Frequency { get; set; } // "Daily", "Weekly", "Monthly"

        [Display(Name = "Deadline Time")]
        public TimeSpan DeadlineTime { get; set; } = new TimeSpan(17, 0, 0); // 5:00 PM default

        [Display(Name = "Deadline Day of Week")]
        public DayOfWeek? DeadlineDayOfWeek { get; set; } // Used for Weekly (e.g. Friday)

        [Display(Name = "Deadline Day of Month")]
        public int? DeadlineDayOfMonth { get; set; } // Used for Monthly (e.g. 28)

        public bool IsActive { get; set; } = true;

        // TEMPLATE FLAGS
        public bool RequireTimeLog { get; set; }
        
        // TIME LOG SETTINGS
        public TimeSpan? WorkStartTime { get; set; }
        public TimeSpan? WorkEndTime { get; set; }
        public TimeSpan? BreakStartTime { get; set; }
        public TimeSpan? BreakEndTime { get; set; }
        public int TimeLogIntervalHours { get; set; } = 1;
        public bool Use24HourFormat { get; set; } = false;

        public bool RequireAchievements { get; set; }
        public bool RequireChallenges { get; set; }
        public bool RequireNextDayPlan { get; set; }
        public bool RequireFileUpload { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpReportParticipant>? Participants { get; set; }
        public ICollection<BcpReportSubmission>? Submissions { get; set; }
    }
}


