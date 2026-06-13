using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("vendormaster")]
    public class VendorMaster
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [MaxLength(50)]
        [Column("vendor_no")]
        public string? VendorNo { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("vendor_type")]
        public string VendorType { get; set; } = "Dalal";

        [MaxLength(50)]
        [Column("city")]
        public string? City { get; set; }

        [MaxLength(15)]
        [Column("mobile")]
        public string? Mobile { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
