using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("boxsales")]
    public class BoxSale
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("selling_no")]
        public int SellingNo { get; set; }

        [Column("selling_date")]
        public DateTime SellingDate { get; set; }

        [Column("party_id")]
        public int PartyId { get; set; }

        [Column("dalal_id")]
        public int? DalalId { get; set; }

        [MaxLength(10)]
        [Column("currency_type")]
        public string? CurrencyType { get; set; }

        [Column("total_dollar")]
        public int? TotalDollar { get; set; }

        [Column("dollar_rate")]
        public decimal? DollarRate { get; set; }

        [Column("price")]
        public int Price { get; set; }

        [Column("total_price")]
        public int TotalPrice { get; set; }

        [Column("discount")]
        public decimal Discount { get; set; }

        [Column("discounted_amount")]
        public int DiscountedAmount { get; set; }

        [Column("dalali")]
        public decimal Dalali { get; set; }

        [Column("dalali_amount")]
        public int DalaliAmount { get; set; }

        [Column("bill_percentage")]
        public decimal BillPercentage { get; set; }

        [Column("bill_amount")]
        public int BillAmount { get; set; }

        [Column("cash_amount")]
        public int CashAmount { get; set; }

        [Column("gst")]
        public int Gst { get; set; }

        [Column("net_bill_amount")]
        public int NetBillAmount { get; set; }

        [Column("net_cash_amount")]
        public int NetCashAmount { get; set; }

        [Column("final_amount")]
        public int FinalAmount { get; set; }

        [Column("deadline_days")]
        public int DeadlineDays { get; set; }

        [Column("deadline_date")]
        public DateTime DeadlineDate { get; set; }

        [Column("created_by")]
        public int? CreatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("PartyId")]
        public virtual PartyMaster? Party { get; set; }

        [ForeignKey("DalalId")]
        public virtual VendorMaster? Dalal { get; set; }

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public virtual ICollection<BoxSaleItem> SaleItems { get; set; } = new List<BoxSaleItem>();
    }
}
