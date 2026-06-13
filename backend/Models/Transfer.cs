using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("transfers")]
    public class Transfer
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("transfer_no")]
        public string TransferNo { get; set; } = string.Empty;

        [Column("date")]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(15)]
        [Column("item_type")]
        public string ItemType { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("from_location")]
        public string FromLocation { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("to_location")]
        public string ToLocation { get; set; } = string.Empty;

        [MaxLength(255)]
        [Column("remarks")]
        public string? Remarks { get; set; }

        [Column("created_by")]
        public int? CreatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<TransferItem> Items { get; set; } = new List<TransferItem>();
    }
}
