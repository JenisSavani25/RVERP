using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("boxsaleitems")]
    public class BoxSaleItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("box_sale_id")]
        public int BoxSaleId { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("box_id")]
        public string BoxId { get; set; } = string.Empty;

        [Column("carat")]
        public decimal Carat { get; set; }

        [Column("m_price")]
        public int MPrice { get; set; }

        [Column("m_value")]
        public int MValue { get; set; }

        [ForeignKey("BoxSaleId")]
        public virtual BoxSale? BoxSale { get; set; }

        [ForeignKey("BoxId")]
        public virtual Box? Box { get; set; }
    }
}
