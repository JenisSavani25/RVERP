using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("boxes")]
    public class Box
    {
        [Key]
        [Column("box_id")]
        [MaxLength(50)]
        public string BoxId { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("id_char")]
        public string IdChar { get; set; } = string.Empty;

        [Column("id_num")]
        public int IdNum { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("shape1")]
        public string Shape1 { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("color")]
        public string Color { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("purity")]
        public string Purity { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("mm")]
        public string Mm { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("shape2")]
        public string Shape2 { get; set; } = string.Empty;

        [Column("carat")]
        public decimal Carat { get; set; }

        [Column("m_price")]
        public int MPrice { get; set; }

        [Column("m_value")]
        public int MValue { get; set; }

        [Column("created_by")]
        public int? CreatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<BoxItem> BoxItems { get; set; } = new List<BoxItem>();
    }
}
