using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("vendorissues")]
    public class VendorIssue
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("issue_no")]
        public string IssueNo { get; set; } = string.Empty;

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("vendor_id")]
        public int VendorId { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("status")]
        public string Status { get; set; } = "Pending";

        [MaxLength(255)]
        [Column("remarks")]
        public string? Remarks { get; set; }

        [Column("created_by")]
        public int? CreatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("VendorId")]
        public virtual VendorMaster? Vendor { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<VendorIssueItem> Items { get; set; } = new List<VendorIssueItem>();
    }
}
