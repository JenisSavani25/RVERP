using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("conversions")]
    public class Conversion
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("conversion_date")]
        public DateTime ConversionDate { get; set; }

        [Column("rough_pieces")]
        public int RoughPieces { get; set; }

        [Column("polish_pieces")]
        public int PolishPieces { get; set; }

        // Source Rough Buy this conversion was made from
        [Column("rough_buying_no")]
        public int? RoughBuyingNo { get; set; }

        // Carat of polished diamonds produced
        [Column("polished_carat")]
        public decimal? PolishedCarat { get; set; }

        // Diamonds that did not get polished (rejected / leftover)
        [Column("not_polished_pieces")]
        public int? NotPolishedPieces { get; set; }

        [Column("not_polished_carat")]
        public decimal? NotPolishedCarat { get; set; }

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
    }
}
