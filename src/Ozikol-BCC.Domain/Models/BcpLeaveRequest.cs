using Ozikol_BCC.Domain.Enum;
using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpLeaveRequest
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        public string? UserId { get; set; }
        public Profile? User { get; set; }

        [Required]
        [Display(Name = "Request Type")]
        public Enum.Enum.LeaveRequestType Type { get; set; }

        [Required]
        [Display(Name = "Start Date")]
        public DateTime StartDate { get; set; }

        [Display(Name = "End Date")]
        public DateTime? EndDate { get; set; }

        [Required]
        [Display(Name = "Reason / Excuse")]
        public string? Reason { get; set; }

        public string? AttachmentUrl { get; set; }
        public string? AttachmentKey { get; set; }

        [Required]
        [Display(Name = "Status")]
        public Enum.Enum.LeaveRequestStatus Status { get; set; }

        [Required]
        [Display(Name = "Date Submitted")]
        public DateTime DateSubmitted { get; set; }

        public string? ReviewedById { get; set; }
        public Profile? ReviewedBy { get; set; }

        [Display(Name = "Date Reviewed")]
        public DateTime? DateReviewed { get; set; }

        [Display(Name = "Reviewer Remarks")]
        public string? ReviewerRemarks { get; set; }
    }
}


