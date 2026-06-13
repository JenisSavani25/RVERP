using Microsoft.EntityFrameworkCore;

namespace backend.Models
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<PartyMaster> Parties { get; set; } = null!;
        public DbSet<VendorMaster> Vendors { get; set; } = null!;
        public DbSet<RoughBuy> RoughBuys { get; set; } = null!;
        public DbSet<RoughSale> RoughSales { get; set; } = null!;
        public DbSet<Conversion> Conversions { get; set; } = null!;
        public DbSet<PolishLot> PolishLots { get; set; } = null!;
        public DbSet<PolishSale> PolishSales { get; set; } = null!;
        public DbSet<Box> Boxes { get; set; } = null!;
        public DbSet<BoxItem> BoxItems { get; set; } = null!;
        public DbSet<BoxSale> BoxSales { get; set; } = null!;
        public DbSet<BoxSaleItem> BoxSaleItems { get; set; } = null!;
        public DbSet<Transfer> Transfers { get; set; } = null!;
        public DbSet<TransferItem> TransferItems { get; set; } = null!;
        public DbSet<VendorIssue> VendorIssues { get; set; } = null!;
        public DbSet<VendorIssueItem> VendorIssueItems { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure primary keys for tables with non-standard names or strings
            modelBuilder.Entity<PolishLot>()
                .HasKey(p => p.LotId);

            modelBuilder.Entity<Box>()
                .HasKey(b => b.BoxId);

            // Cascade rules - set Restrict or ClientSetNull to avoid multiple cascade paths in PostgreSQL
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.RoughBuy)
                .WithMany(b => b.Payments)
                .HasForeignKey(p => p.RoughBuyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.RoughSale)
                .WithMany(s => s.Payments)
                .HasForeignKey(p => p.RoughSaleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.PolishLot)
                .WithMany(l => l.Payments)
                .HasForeignKey(p => p.PolishLotId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.PolishSale)
                .WithMany(s => s.Payments)
                .HasForeignKey(p => p.PolishSaleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.BoxSale)
                .WithMany(s => s.Payments)
                .HasForeignKey(p => p.BoxSaleId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
