using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("payments")]
    public class Payment
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [MaxLength(50)]
        [Column("payment_id")]
        public string? PaymentId { get; set; }

        [Column("payment_date")]
        public DateTime PaymentDate { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("payment_type")]
        public string PaymentType { get; set; } = string.Empty;

        [Column("amount")]
        public int Amount { get; set; }

        [MaxLength(255)]
        [Column("remarks")]
        public string? Remarks { get; set; }

        [Column("rough_buy_id")]
        public int? RoughBuyId { get; set; }

        [Column("rough_sale_id")]
        public int? RoughSaleId { get; set; }

        [MaxLength(50)]
        [Column("polish_lot_id")]
        public string? PolishLotId { get; set; }

        [Column("polish_sale_id")]
        public int? PolishSaleId { get; set; }

        [Column("box_sale_id")]
        public int? BoxSaleId { get; set; }

        [Column("created_by")]
        public int? CreatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("RoughBuyId")]
        public virtual RoughBuy? RoughBuy { get; set; }

        [ForeignKey("RoughSaleId")]
        public virtual RoughSale? RoughSale { get; set; }

        [ForeignKey("PolishLotId")]
        public virtual PolishLot? PolishLot { get; set; }

        [ForeignKey("PolishSaleId")]
        public virtual PolishSale? PolishSale { get; set; }

        [ForeignKey("BoxSaleId")]
        public virtual BoxSale? BoxSale { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
    }
}
