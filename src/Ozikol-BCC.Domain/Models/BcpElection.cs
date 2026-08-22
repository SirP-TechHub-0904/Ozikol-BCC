using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Voting aggregate for BCP elections and polls. It owns categories and voter
    /// accreditation rules while actual cast votes remain separate records.
    /// </summary>
    public class BcpElection
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        [Required]
        [Display(Name = "Election Title")]
        public string? Title { get; set; }
        
        public string? ShortCode { get; set; }
        
        [Display(Name = "Instructions for Voters")]
        public string? Instructions { get; set; }

        [Display(Name = "Start Date")]
        public DateTime StartDate { get; set; }

        [Display(Name = "End Date")]
        public DateTime EndDate { get; set; }

        [Display(Name = "Election Type")]
        public BcpElectionType ElectionType { get; set; }

        [Display(Name = "Status")]
        public BcpVotingStatus VotingStatus { get; set; }

        [Display(Name = "Publish Live Results")]
        public bool ShowResults { get; set; }
        
        [Display(Name = "Enable Candidate Images")]
        public bool EnableCandidateImages { get; set; }
        
        /// <summary>
        /// When true, voters must make a choice in every category before completion.
        /// </summary>
        public bool RequireAllCategories { get; set; } // Enforce voting in all categories

        public string? ElectionBannerUrl { get; set; }
        public string? ElectionBannerKey { get; set; }

        public ICollection<BcpVoteCategory>? BcpVoteCategories { get; set; }
        
        [InverseProperty("BcpElection")]
        public ICollection<BcpElectionVoter>? BcpElectionVoters { get; set; }
    }
}


