using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("vendorissueitems")]
    public class VendorIssueItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("issue_id")]
        public int IssueId { get; set; }

        [Required]
        [MaxLength(15)]
        [Column("item_type")]
        public string ItemType { get; set; } = string.Empty;

        [MaxLength(50)]
        [Column("polish_lot_id")]
        public string? PolishLotId { get; set; }

        [Column("quantity")]
        public int? Quantity { get; set; }

        [MaxLength(50)]
        [Column("box_id")]
        public string? BoxId { get; set; }

        [ForeignKey("IssueId")]
        public virtual VendorIssue? VendorIssue { get; set; }

        [ForeignKey("PolishLotId")]
        public virtual PolishLot? PolishLot { get; set; }

        [ForeignKey("BoxId")]
        public virtual Box? Box { get; set; }
    }
}
