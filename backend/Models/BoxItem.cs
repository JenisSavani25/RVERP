using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("boxitems")]
    public class BoxItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("box_id")]
        public string BoxId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("polish_lot_id")]
        public string PolishLotId { get; set; } = string.Empty;

        [Column("quantity")]
        public int Quantity { get; set; }

        [ForeignKey("BoxId")]
        public virtual Box? Box { get; set; }

        [ForeignKey("PolishLotId")]
        public virtual PolishLot? PolishLot { get; set; }
    }
}
