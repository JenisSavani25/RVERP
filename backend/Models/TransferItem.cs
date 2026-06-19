using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("transferitems")]
    public class TransferItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("transfer_id")]
        public int TransferId { get; set; }

        [MaxLength(50)]
        [Column("polish_lot_id")]
        public string? PolishLotId { get; set; }

        [MaxLength(100)]
        [Column("shape_name")]
        public string? ShapeName { get; set; }

        [Column("quantity")]
        public int? Quantity { get; set; }

        [Column("carat")]
        public decimal? Carat { get; set; }

        [MaxLength(50)]
        [Column("box_id")]
        public string? BoxId { get; set; }

        [ForeignKey("TransferId")]
        public virtual Transfer? Transfer { get; set; }

        [ForeignKey("PolishLotId")]
        public virtual PolishLot? PolishLot { get; set; }

        [ForeignKey("BoxId")]
        public virtual Box? Box { get; set; }
    }
}
