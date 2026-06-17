using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using System.Text.Json.Serialization;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ERPController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ERPController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. Unified GET all lists for initial page boot load
        [HttpGet("all-data")]
        public async Task<IActionResult> GetAllData()
        {
            var buys = await _context.RoughBuys
                .Include(r => r.Party)
                .Include(r => r.Dalal)
                .Include(r => r.Payments)
                .OrderBy(r => r.BuyingNo)
                .ToListAsync();

            var sales = await _context.RoughSales
                .Include(r => r.Party)
                .Include(r => r.Dalal)
                .Include(r => r.Payments)
                .OrderBy(r => r.SellingNo)
                .ToListAsync();

            var polishLots = await _context.PolishLots
                .Include(r => r.Party)
                .Include(r => r.Dalal)
                .Include(r => r.Payments)
                .OrderBy(r => r.BuyingNo)
                .ToListAsync();

            var polishSales = await _context.PolishSales
                .Include(r => r.Party)
                .Include(r => r.Dalal)
                .Include(r => r.Payments)
                .OrderBy(r => r.SellingNo)
                .ToListAsync();

            var conversions = await _context.Conversions
                .OrderBy(c => c.Id)
                .ToListAsync();

            var boxes = await _context.Boxes
                .Include(b => b.BoxItems)
                .OrderBy(b => b.BoxId)
                .ToListAsync();

            var boxSales = await _context.BoxSales
                .Include(r => r.Party)
                .Include(r => r.Dalal)
                .Include(r => r.Payments)
                .Include(r => r.SaleItems)
                .OrderBy(r => r.SellingNo)
                .ToListAsync();

            var transfers = await _context.Transfers
                .Include(t => t.Items)
                .OrderBy(t => t.TransferNo)
                .ToListAsync();

            var vendors = await _context.Vendors
                .OrderBy(v => v.VendorNo)
                .ToListAsync();

            var issues = await _context.VendorIssues
                .Include(i => i.Items)
                .OrderBy(i => i.IssueNo)
                .ToListAsync();

            // Map entities to JSON DTO Dictionaries/Objects matching JS expected properties
            var response = new
            {
                buysList = buys.Select(MapRoughBuy).ToList(),
                salesList = sales.Select(MapRoughSale).ToList(),
                polishBuysList = polishLots.Select(MapPolishLot).ToList(),
                polishSalesList = polishSales.Select(MapPolishSale).ToList(),
                conversionList = conversions.Select(MapConversion).ToList(),
                boxMakingList = boxes.Select(MapBox).ToList(),
                boxSellingList = boxSales.Select(MapBoxSale).ToList(),
                transfersList = transfers.Select(MapTransfer).ToList(),
                vendorsList = vendors.Select(MapVendor).ToList(),
                issuesList = issues.Select(MapVendorIssue).ToList()
            };

            return Ok(response);
        }

        // 2. POST endpoints for each entity type
        [HttpPost("rough-buys")]
        public async Task<IActionResult> CreateRoughBuy([FromBody] RoughBuyInput input)
        {
            var partyId = await GetOrCreatePartyIdAsync(input.PartyName);
            var dalalId = await GetOrCreateVendorIdAsync(input.Dalal, "Dalal");

            var entity = new RoughBuy
            {
                BuyingNo = input.BuyingNo,
                BuyingDate = ToUtc(input.BuyingDate),
                PartyId = partyId,
                DalalId = dalalId,
                CurrencyType = input.CurrencyType,
                TotalDollar = input.TotalDollar,
                DollarRate = input.DollarRate,
                Price = input.Price,
                TotalPrice = input.TotalPrice,
                Discount = input.Discount,
                DiscountedAmount = input.DiscountedAmount,
                Dalali = input.Dalali,
                DalaliAmount = input.DalaliAmount,
                BillPercentage = input.BillPercentage,
                BillAmount = input.BillAmount,
                CashAmount = input.CashAmount,
                Gst = input.Gst,
                NetBillAmount = input.NetBillAmount,
                NetCashAmount = input.NetCashAmount,
                FinalAmount = input.FinalAmount,
                DeadlineDays = input.DeadlineDays,
                DeadlineDate = ToUtc(input.DeadlineDate),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.Payments != null)
            {
                foreach (var p in input.Payments)
                {
                    entity.Payments.Add(new Payment
                    {
                        PaymentId = p.Id,
                        PaymentDate = ToUtc(p.Date),
                        PaymentType = p.Type,
                        Amount = p.Amount,
                        Remarks = p.Remarks,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.RoughBuys.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("rough-sales")]
        public async Task<IActionResult> CreateRoughSale([FromBody] RoughSaleInput input)
        {
            var partyId = await GetOrCreatePartyIdAsync(input.PartyName);
            var dalalId = await GetOrCreateVendorIdAsync(input.Dalal, "Dalal");

            var entity = new RoughSale
            {
                SellingNo = input.SellingNo,
                SellingDate = ToUtc(input.SellingDate),
                PartyId = partyId,
                DalalId = dalalId,
                Pieces = input.Pieces,
                Carat = input.Carat,
                CurrencyType = input.CurrencyType,
                TotalDollar = input.TotalDollar,
                DollarRate = input.DollarRate,
                Price = input.Price,
                TotalPrice = input.TotalPrice,
                Discount = input.Discount,
                DiscountedAmount = input.DiscountedAmount,
                BillPercentage = input.BillPercentage,
                BillAmount = input.BillAmount,
                CashAmount = input.CashAmount,
                Gst = input.Gst,
                NetBillAmount = input.NetBillAmount,
                NetCashAmount = input.NetCashAmount,
                FinalAmount = input.FinalAmount,
                DeadlineDays = input.DeadlineDays,
                DeadlineDate = ToUtc(input.DeadlineDate),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.Payments != null)
            {
                foreach (var p in input.Payments)
                {
                    entity.Payments.Add(new Payment
                    {
                        PaymentId = p.Id,
                        PaymentDate = ToUtc(p.Date),
                        PaymentType = p.Type,
                        Amount = p.Amount,
                        Remarks = p.Remarks,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.RoughSales.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("polish-lots")]
        public async Task<IActionResult> CreatePolishLot([FromBody] PolishLotInput input)
        {
            var partyId = await GetOrCreatePartyIdAsync(input.PartyName);
            var dalalId = await GetOrCreateVendorIdAsync(input.Dalal, "Dalal");

            var entity = new PolishLot
            {
                LotId = $"PB-{input.BuyingNo}",
                BuyingNo = input.BuyingNo,
                BuyingDate = ToUtc(input.BuyingDate),
                PartyId = partyId,
                DalalId = dalalId,
                Pieces = input.Pieces,
                Carat = input.Carat,
                CurrencyType = input.CurrencyType,
                TotalDollar = input.TotalDollar,
                DollarRate = input.DollarRate,
                Price = input.Price,
                TotalPrice = input.TotalPrice,
                Discount = input.Discount,
                DiscountedAmount = input.DiscountedAmount,
                BillPercentage = input.BillPercentage,
                BillAmount = input.BillAmount,
                CashAmount = input.CashAmount,
                Gst = input.Gst,
                NetBillAmount = input.NetBillAmount,
                NetCashAmount = input.NetCashAmount,
                FinalAmount = input.FinalAmount,
                DeadlineDays = input.DeadlineDays,
                DeadlineDate = ToUtc(input.DeadlineDate),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.Payments != null)
            {
                foreach (var p in input.Payments)
                {
                    entity.Payments.Add(new Payment
                    {
                        PaymentId = p.Id,
                        PaymentDate = ToUtc(p.Date),
                        PaymentType = p.Type,
                        Amount = p.Amount,
                        Remarks = p.Remarks,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.PolishLots.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("polish-sales")]
        public async Task<IActionResult> CreatePolishSale([FromBody] PolishSaleInput input)
        {
            var partyId = await GetOrCreatePartyIdAsync(input.PartyName);
            var dalalId = await GetOrCreateVendorIdAsync(input.Dalal, "Dalal");

            var entity = new PolishSale
            {
                SellingNo = input.SellingNo,
                SellingDate = ToUtc(input.SellingDate),
                PartyId = partyId,
                DalalId = dalalId,
                Pieces = input.Pieces,
                Carat = input.Carat,
                CurrencyType = input.CurrencyType,
                TotalDollar = input.TotalDollar,
                DollarRate = input.DollarRate,
                Price = input.Price,
                TotalPrice = input.TotalPrice,
                Discount = input.Discount,
                DiscountedAmount = input.DiscountedAmount,
                Dalali = input.Dalali,
                DalaliAmount = input.DalaliAmount,
                BillPercentage = input.BillPercentage,
                BillAmount = input.BillAmount,
                CashAmount = input.CashAmount,
                Gst = input.Gst,
                NetBillAmount = input.NetBillAmount,
                NetCashAmount = input.NetCashAmount,
                FinalAmount = input.FinalAmount,
                DeadlineDays = input.DeadlineDays,
                DeadlineDate = ToUtc(input.DeadlineDate),
                LotId = input.LotId,
                SourceLocation = input.SourceLocation,
                IssueNo = input.IssueNo,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.Payments != null)
            {
                foreach (var p in input.Payments)
                {
                    entity.Payments.Add(new Payment
                    {
                        PaymentId = p.Id,
                        PaymentDate = ToUtc(p.Date),
                        PaymentType = p.Type,
                        Amount = p.Amount,
                        Remarks = p.Remarks,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.PolishSales.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("conversions")]
        public async Task<IActionResult> CreateConversion([FromBody] ConversionInput input)
        {
            var conversion = new Conversion
            {
                ConversionDate = ToUtc(input.ConversionDate),
                RoughPieces = input.RoughPieces,
                PolishPieces = input.PolishPieces,
                Remarks = input.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Conversions.Add(conversion);
            await _context.SaveChangesAsync();

            // Auto-create PolishLot for the Conversion
            var lotId = $"CONV-{conversion.Id}";
            var polishLot = new PolishLot
            {
                LotId = lotId,
                BuyingDate = ToUtc(input.ConversionDate),
                Pieces = input.PolishPieces,
                Carat = input.PolishPieces * 0.1m, // Approx carat
                ConversionId = conversion.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PolishLots.Add(polishLot);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("boxes")]
        public async Task<IActionResult> CreateBox([FromBody] BoxInput input)
        {
            var box = new Box
            {
                BoxId = input.IdNo,
                IdChar = input.IdChar,
                IdNum = input.IdNum,
                Shape1 = input.Shape1,
                Color = input.Color,
                Purity = input.Purity,
                Mm = input.Mm,
                Shape2 = input.Shape2,
                Carat = input.Carat,
                MPrice = input.MPrice,
                MValue = input.MValue,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // To support FIFO Polish Stock deduction in Box Making:
            // Deduct 2 pieces from active PolishLots on the database side
            // and log them into BoxItems!
            var activeLots = await _context.PolishLots
                .OrderBy(l => l.LotId)
                .ToListAsync();

            // Calculate current Polish lot stock in database
            // Note: Keep it 1:1 with frontend calculation getPolishStockDistribution
            int needed = 2;
            foreach (var lot in activeLots)
            {
                // Simple DB check: how many pieces have been consumed from this lot in BoxItems
                int consumed = await _context.BoxItems.Where(bi => bi.PolishLotId == lot.LotId).SumAsync(bi => bi.Quantity);
                int transferredOut = await _context.TransferItems.Where(ti => ti.Transfer!.ItemType == "Polish" && ti.Transfer.FromLocation == "Surat" && ti.PolishLotId == lot.LotId).SumAsync(ti => ti.Quantity ?? 0);
                int transferredIn = await _context.TransferItems.Where(ti => ti.Transfer!.ItemType == "Polish" && ti.Transfer.ToLocation == "Surat" && ti.PolishLotId == lot.LotId).SumAsync(ti => ti.Quantity ?? 0);
                
                // Polish Sales from Surat
                int soldFromSurat = await _context.PolishSales
                    .Where(s => s.SourceLocation == "Surat" && s.LotId != null && s.LotId.Contains(lot.LotId))
                    .SumAsync(s => s.Pieces); // Simplistic lookup

                int suratStock = lot.Pieces - consumed - transferredOut + transferredIn - soldFromSurat;
                
                if (suratStock > 0)
                {
                    int take = Math.Min(needed, suratStock);
                    box.BoxItems.Add(new BoxItem
                    {
                        PolishLotId = lot.LotId,
                        Quantity = take
                    });
                    needed -= take;
                    if (needed <= 0) break;
                }
            }

            _context.Boxes.Add(box);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("box-sales")]
        public async Task<IActionResult> CreateBoxSale([FromBody] BoxSaleInput input)
        {
            var partyId = await GetOrCreatePartyIdAsync(input.PartyName);
            var dalalId = await GetOrCreateVendorIdAsync(input.Dalal, "Dalal");

            var entity = new BoxSale
            {
                SellingNo = input.SellingNo,
                SellingDate = ToUtc(input.SellingDate),
                PartyId = partyId,
                DalalId = dalalId,
                CurrencyType = input.CurrencyType,
                TotalDollar = input.TotalDollar,
                DollarRate = input.DollarRate,
                Price = input.Price,
                TotalPrice = input.TotalPrice,
                Discount = input.Discount,
                DiscountedAmount = input.DiscountedAmount,
                Dalali = input.Dalali,
                DalaliAmount = input.DalaliAmount,
                BillPercentage = input.BillPercentage,
                BillAmount = input.BillAmount,
                CashAmount = input.CashAmount,
                Gst = input.Gst,
                NetBillAmount = input.NetBillAmount,
                NetCashAmount = input.NetCashAmount,
                FinalAmount = input.FinalAmount,
                DeadlineDays = input.DeadlineDays,
                DeadlineDate = ToUtc(input.DeadlineDate),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.Items != null)
            {
                foreach (var item in input.Items)
                {
                    entity.SaleItems.Add(new BoxSaleItem
                    {
                        BoxId = item.BoxId,
                        Carat = item.Carat,
                        MPrice = item.MPrice,
                        MValue = item.MValue
                    });
                }
            }

            if (input.Payments != null)
            {
                foreach (var p in input.Payments)
                {
                    entity.Payments.Add(new Payment
                    {
                        PaymentId = p.Id,
                        PaymentDate = ToUtc(p.Date),
                        PaymentType = p.Type,
                        Amount = p.Amount,
                        Remarks = p.Remarks,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.BoxSales.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("transfers")]
        public async Task<IActionResult> CreateTransfer([FromBody] TransferInput input)
        {
            var entity = new Transfer
            {
                TransferNo = input.TransferNo,
                Date = ToUtc(input.Date),
                ItemType = input.ItemType,
                FromLocation = input.FromLocation,
                ToLocation = input.ToLocation,
                Remarks = input.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.ItemType == "Polish" && !string.IsNullOrEmpty(input.LotId))
            {
                entity.Items.Add(new TransferItem
                {
                    PolishLotId = input.LotId,
                    Quantity = input.Quantity
                });
            }
            else if (input.ItemType == "Dabbi" && input.BoxIds != null)
            {
                foreach (var boxId in input.BoxIds)
                {
                    entity.Items.Add(new TransferItem
                    {
                        BoxId = boxId
                    });
                }
            }

            _context.Transfers.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("vendors")]
        public async Task<IActionResult> CreateVendor([FromBody] VendorInput input)
        {
            var entity = new VendorMaster
            {
                VendorNo = input.VendorId,
                Name = input.Name,
                VendorType = input.VendorType,
                City = input.City,
                Mobile = input.Mobile,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Vendors.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("vendor-issues")]
        public async Task<IActionResult> CreateVendorIssue([FromBody] VendorIssueInput input)
        {
            // Resolve vendor by its V-x number code
            var vendor = await _context.Vendors.FirstOrDefaultAsync(v => v.VendorNo == input.VendorId);
            if (vendor == null) return BadRequest("Vendor not found");

            var entity = new VendorIssue
            {
                IssueNo = input.IssueNo,
                Date = ToUtc(input.Date),
                VendorId = vendor.Id,
                Status = "Pending",
                Remarks = input.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.Items != null)
            {
                foreach (var item in input.Items)
                {
                    entity.Items.Add(new VendorIssueItem
                    {
                        ItemType = item.Type,
                        PolishLotId = item.Type == "Polish" ? item.LotId : null,
                        Quantity = item.Type == "Polish" ? item.Quantity : null,
                        BoxId = item.Type == "Dabbi" ? item.Id : null
                    });
                }
            }

            _context.VendorIssues.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // Resolves or updates a Vendor Issue Status (Called when vendor issue is marked Returned or Sold)
        [HttpPost("vendor-issues/resolve")]
        public async Task<IActionResult> ResolveVendorIssue([FromBody] ResolveIssueInput input)
        {
            var issue = await _context.VendorIssues.FirstOrDefaultAsync(i => i.IssueNo == input.IssueNo);
            if (issue == null) return NotFound("Issue not found");

            issue.Status = input.Status;
            issue.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("vendor-issues/update")]
        public async Task<IActionResult> UpdateVendorIssue([FromBody] VendorIssueInput input)
        {
            var issue = await _context.VendorIssues
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.IssueNo == input.IssueNo);
            if (issue == null) return NotFound("Issue not found");

            issue.Status = input.Status ?? issue.Status;
            issue.Remarks = input.Remarks ?? issue.Remarks;
            issue.UpdatedAt = DateTime.UtcNow;

            _context.VendorIssueItems.RemoveRange(issue.Items);
            if (input.Items != null)
            {
                foreach (var item in input.Items)
                {
                    issue.Items.Add(new VendorIssueItem
                    {
                        ItemType = item.Type,
                        PolishLotId = item.Type == "Polish" ? item.LotId : null,
                        Quantity = item.Type == "Polish" ? item.Quantity : null,
                        BoxId = item.Type == "Dabbi" ? item.Id : null
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // 3. Payment endpoints (For additions/deletions in ledger_details.js)
        [HttpPost("payments")]
        public async Task<IActionResult> AddPayment([FromBody] AddPaymentInput input)
        {
            var payment = new Payment
            {
                PaymentId = input.PaymentId,
                PaymentDate = ToUtc(input.Date),
                PaymentType = input.Type,
                Amount = input.Amount,
                Remarks = input.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (input.TransactionType == "sales")
            {
                var txn = await _context.RoughSales.FirstOrDefaultAsync(s => s.SellingNo == input.TransactionId);
                if (txn != null) payment.RoughSaleId = txn.Id;
            }
            else if (input.TransactionType == "buys")
            {
                var txn = await _context.RoughBuys.FirstOrDefaultAsync(b => b.BuyingNo == input.TransactionId);
                if (txn != null) payment.RoughBuyId = txn.Id;
            }
            else if (input.TransactionType == "polish_sales")
            {
                var txn = await _context.PolishSales.FirstOrDefaultAsync(s => s.SellingNo == input.TransactionId);
                if (txn != null) payment.PolishSaleId = txn.Id;
            }
            else if (input.TransactionType == "polish_buys")
            {
                var lotId = $"PB-{input.TransactionId}";
                var lot = await _context.PolishLots.FirstOrDefaultAsync(l => l.LotId == lotId);
                if (lot != null) payment.PolishLotId = lot.LotId;
            }
            else if (input.TransactionType == "box_selling")
            {
                var txn = await _context.BoxSales.FirstOrDefaultAsync(s => s.SellingNo == input.TransactionId);
                if (txn != null) payment.BoxSaleId = txn.Id;
            }

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpDelete("payments/{paymentId}")]
        public async Task<IActionResult> DeletePayment(string paymentId)
        {
            var payment = await _context.Payments.FirstOrDefaultAsync(p => p.PaymentId == paymentId);
            if (payment == null) return NotFound("Payment not found");

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // Helper Mapper Methods to convert C# entity structures to JavaScript local storage structures
        private static object MapRoughBuy(RoughBuy r) => new
        {
            buyingNo = r.BuyingNo,
            buyingDate = r.BuyingDate.ToString("yyyy-MM-dd"),
            dalal = r.Dalal?.Name ?? "",
            partyName = r.Party?.Name ?? "",
            pieces = r.Pieces,
            carat = (double)r.Carat,
            currencyType = r.CurrencyType,
            totalDollar = r.TotalDollar,
            dollarRate = r.DollarRate,
            price = r.Price,
            totalPrice = r.TotalPrice,
            discount = (double)r.Discount,
            discountedAmount = r.DiscountedAmount,
            dalali = (double)r.Dalali,
            dalaliAmount = r.DalaliAmount,
            billPercentage = (double)r.BillPercentage,
            billAmount = r.BillAmount,
            cashAmount = r.CashAmount,
            gst = r.Gst,
            netBillAmount = r.NetBillAmount,
            netCashAmount = r.NetCashAmount,
            finalAmount = r.FinalAmount,
            deadlineDays = r.DeadlineDays,
            deadlineDate = r.DeadlineDate.ToString("yyyy-MM-dd"),
            payments = r.Payments.Select(MapPayment).ToList()
        };

        private static object MapRoughSale(RoughSale r) => new
        {
            sellingNo = r.SellingNo,
            sellingDate = r.SellingDate.ToString("yyyy-MM-dd"),
            dalal = r.Dalal?.Name ?? "",
            partyName = r.Party?.Name ?? "",
            pieces = r.Pieces,
            carat = (double)r.Carat,
            currencyType = r.CurrencyType,
            totalDollar = r.TotalDollar,
            dollarRate = r.DollarRate,
            price = r.Price,
            totalPrice = r.TotalPrice,
            discount = (double)r.Discount,
            discountedAmount = r.DiscountedAmount,
            billPercentage = (double)r.BillPercentage,
            billAmount = r.BillAmount,
            cashAmount = r.CashAmount,
            gst = r.Gst,
            netBillAmount = r.NetBillAmount,
            netCashAmount = r.NetCashAmount,
            finalAmount = r.FinalAmount,
            deadlineDays = r.DeadlineDays,
            deadlineDate = r.DeadlineDate.ToString("yyyy-MM-dd"),
            payments = r.Payments.Select(MapPayment).ToList()
        };

        private static object MapPolishLot(PolishLot r) => new
        {
            buyingNo = r.BuyingNo,
            buyingDate = r.BuyingDate.ToString("yyyy-MM-dd"),
            dalal = r.Dalal?.Name ?? "",
            partyName = r.Party?.Name ?? "",
            pieces = r.Pieces,
            carat = (double)r.Carat,
            currencyType = r.CurrencyType,
            totalDollar = r.TotalDollar,
            dollarRate = r.DollarRate,
            price = r.Price ?? 0,
            totalPrice = r.TotalPrice ?? 0,
            discount = (double)(r.Discount ?? 0),
            discountedAmount = r.DiscountedAmount ?? 0,
            billPercentage = (double)(r.BillPercentage ?? 0),
            billAmount = r.BillAmount ?? 0,
            cashAmount = r.CashAmount ?? 0,
            gst = r.Gst ?? 0,
            netBillAmount = r.NetBillAmount ?? 0,
            netCashAmount = r.NetCashAmount ?? 0,
            finalAmount = r.FinalAmount ?? 0,
            deadlineDays = r.DeadlineDays ?? 0,
            deadlineDate = r.DeadlineDate?.ToString("yyyy-MM-dd") ?? "",
            payments = r.Payments.Select(MapPayment).ToList(),
            lotId = r.LotId,
            conversionId = r.ConversionId
        };

        private static object MapPolishSale(PolishSale s) => new
        {
            sellingNo = s.SellingNo,
            sellingDate = s.SellingDate.ToString("yyyy-MM-dd"),
            dalal = s.Dalal?.Name ?? "",
            partyName = s.Party?.Name ?? "",
            pieces = s.Pieces,
            carat = (double)s.Carat,
            currencyType = s.CurrencyType,
            totalDollar = s.TotalDollar,
            dollarRate = s.DollarRate,
            price = s.Price,
            totalPrice = s.TotalPrice,
            discount = (double)s.Discount,
            discountedAmount = s.DiscountedAmount,
            dalali = (double)s.Dalali,
            dalaliAmount = s.DalaliAmount,
            billPercentage = (double)s.BillPercentage,
            billAmount = s.BillAmount,
            cashAmount = s.CashAmount,
            gst = s.Gst,
            netBillAmount = s.NetBillAmount,
            netCashAmount = s.NetCashAmount,
            finalAmount = s.FinalAmount,
            deadlineDays = s.DeadlineDays,
            deadlineDate = s.DeadlineDate.ToString("yyyy-MM-dd"),
            payments = s.Payments.Select(MapPayment).ToList(),
            lotId = s.LotId,
            sourceLocation = s.SourceLocation,
            issueNo = s.IssueNo
        };

        private static object MapConversion(Conversion c) => new
        {
            conversionDate = c.ConversionDate.ToString("yyyy-MM-dd"),
            roughPieces = c.RoughPieces,
            polishPieces = c.PolishPieces,
            remarks = c.Remarks,
            createdAt = c.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        private static object MapBox(Box b) => new
        {
            idNo = b.BoxId,
            idChar = b.IdChar,
            idNum = b.IdNum,
            shape1 = b.Shape1,
            color = b.Color,
            purity = b.Purity,
            mm = b.Mm,
            shape2 = b.Shape2,
            carat = (double)b.Carat,
            mPrice = b.MPrice,
            mValue = b.MValue,
            createdAt = b.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        private static object MapBoxSale(BoxSale s) => new
        {
            sellingNo = s.SellingNo,
            sellingDate = s.SellingDate.ToString("yyyy-MM-dd"),
            dalal = s.Dalal?.Name ?? "",
            partyName = s.Party?.Name ?? "",
            currencyType = s.CurrencyType,
            totalDollar = s.TotalDollar,
            dollarRate = s.DollarRate,
            price = s.Price,
            totalPrice = s.TotalPrice,
            discount = (double)s.Discount,
            discountedAmount = s.DiscountedAmount,
            dalali = (double)s.Dalali,
            dalaliAmount = s.DalaliAmount,
            billPercentage = (double)s.BillPercentage,
            billAmount = s.BillAmount,
            cashAmount = s.CashAmount,
            gst = s.Gst,
            netBillAmount = s.NetBillAmount,
            netCashAmount = s.NetCashAmount,
            finalAmount = s.FinalAmount,
            deadlineDays = s.DeadlineDays,
            deadlineDate = s.DeadlineDate.ToString("yyyy-MM-dd"),
            payments = s.Payments.Select(MapPayment).ToList(),
            items = s.SaleItems.Select(si => new
            {
                boxId = si.BoxId,
                carat = (double)si.Carat,
                mPrice = si.MPrice,
                mValue = si.MValue
            }).ToList()
        };

        private static object MapTransfer(Transfer t)
        {
            if (t.ItemType == "Polish")
            {
                var firstItem = t.Items.FirstOrDefault();
                return new
                {
                    transferNo = t.TransferNo,
                    date = t.Date.ToString("yyyy-MM-dd"),
                    itemType = t.ItemType,
                    fromLocation = t.FromLocation,
                    toLocation = t.ToLocation,
                    remarks = t.Remarks,
                    lotId = firstItem?.PolishLotId ?? "",
                    quantity = firstItem?.Quantity ?? 0
                };
            }
            else
            {
                return new
                {
                    transferNo = t.TransferNo,
                    date = t.Date.ToString("yyyy-MM-dd"),
                    itemType = t.ItemType,
                    fromLocation = t.FromLocation,
                    toLocation = t.ToLocation,
                    remarks = t.Remarks,
                    boxIds = t.Items.Select(i => i.BoxId).ToList()
                };
            }
        }

        private static object MapVendor(VendorMaster v) => new
        {
            vendorId = v.VendorNo ?? "",
            name = v.Name,
            vendorType = v.VendorType,
            city = v.City,
            mobile = v.Mobile,
            createdAt = v.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        private static object MapVendorIssue(VendorIssue i) => new
        {
            issueNo = i.IssueNo,
            date = i.Date.ToString("yyyy-MM-dd"),
            vendorId = i.Vendor?.VendorNo ?? "",
            vendorName = i.Vendor?.Name ?? "",
            items = i.Items.Select(item =>
            {
                if (item.ItemType == "Polish")
                {
                    return (object)new { type = "Polish", lotId = item.PolishLotId, quantity = item.Quantity };
                }
                else
                {
                    return (object)new { type = "Dabbi", id = item.BoxId };
                }
            }).ToList(),
            status = i.Status,
            resolvedDate = i.UpdatedAt.ToString("yyyy-MM-dd"), // resolved/updated date
            createdAt = i.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        private static object MapPayment(Payment p) => new
        {
            id = p.PaymentId ?? $"pay_{p.Id}",
            date = p.PaymentDate.ToString("yyyy-MM-dd"),
            type = p.PaymentType,
            amount = p.Amount,
            remarks = p.Remarks
        };

        private static DateTime ToUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc) return value;
            if (value.Kind == DateTimeKind.Unspecified)
            {
                return DateTime.SpecifyKind(value, DateTimeKind.Utc);
            }
            return value.ToUniversalTime();
        }

        // Helper Lookups
        private async Task<int> GetOrCreatePartyIdAsync(string partyName)
        {
            if (string.IsNullOrWhiteSpace(partyName)) return 0;
            var partyNameTrim = partyName.Trim();
            var party = await _context.Parties.FirstOrDefaultAsync(p => p.Name.ToLower() == partyNameTrim.ToLower());
            if (party == null)
            {
                party = new PartyMaster { Name = partyNameTrim };
                _context.Parties.Add(party);
                await _context.SaveChangesAsync();
            }
            return party.Id;
        }

        private async Task<int?> GetOrCreateVendorIdAsync(string? dalalName, string type = "Dalal")
        {
            if (string.IsNullOrWhiteSpace(dalalName)) return null;
            var nameTrim = dalalName.Trim();
            var vendor = await _context.Vendors.FirstOrDefaultAsync(v => v.Name.ToLower() == nameTrim.ToLower() && v.VendorType == type);
            if (vendor == null)
            {
                vendor = new VendorMaster { Name = nameTrim, VendorType = type };
                _context.Vendors.Add(vendor);
                await _context.SaveChangesAsync();
            }
            return vendor.Id;
        }
    }

    // Input DTO Classes for Controller Endpoint Binding
    public class PaymentInput
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public int Amount { get; set; }
        public string? Remarks { get; set; }
    }

    public class RoughBuyInput
    {
        public int BuyingNo { get; set; }
        public DateTime BuyingDate { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? Dalal { get; set; }
        public int Pieces { get; set; }
        public decimal Carat { get; set; }
        public string? CurrencyType { get; set; }
        public int? TotalDollar { get; set; }
        public decimal? DollarRate { get; set; }
        public int Price { get; set; }
        public int TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public int DiscountedAmount { get; set; }
        public decimal Dalali { get; set; }
        public int DalaliAmount { get; set; }
        public decimal BillPercentage { get; set; }
        public int BillAmount { get; set; }
        public int CashAmount { get; set; }
        public int Gst { get; set; }
        public int NetBillAmount { get; set; }
        public int NetCashAmount { get; set; }
        public int FinalAmount { get; set; }
        public int DeadlineDays { get; set; }
        public DateTime DeadlineDate { get; set; }
        public List<PaymentInput>? Payments { get; set; }
    }

    public class RoughSaleInput
    {
        public int SellingNo { get; set; }
        public DateTime SellingDate { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? Dalal { get; set; }
        public int Pieces { get; set; }
        public decimal Carat { get; set; }
        public string? CurrencyType { get; set; }
        public int? TotalDollar { get; set; }
        public decimal? DollarRate { get; set; }
        public int Price { get; set; }
        public int TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public int DiscountedAmount { get; set; }
        public decimal BillPercentage { get; set; }
        public int BillAmount { get; set; }
        public int CashAmount { get; set; }
        public int Gst { get; set; }
        public int NetBillAmount { get; set; }
        public int NetCashAmount { get; set; }
        public int FinalAmount { get; set; }
        public int DeadlineDays { get; set; }
        public DateTime DeadlineDate { get; set; }
        public List<PaymentInput>? Payments { get; set; }
    }

    public class PolishLotInput
    {
        public int BuyingNo { get; set; }
        public DateTime BuyingDate { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? Dalal { get; set; }
        public int Pieces { get; set; }
        public decimal Carat { get; set; }
        public string? CurrencyType { get; set; }
        public int? TotalDollar { get; set; }
        public decimal? DollarRate { get; set; }
        public int Price { get; set; }
        public int TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public int DiscountedAmount { get; set; }
        public decimal BillPercentage { get; set; }
        public int BillAmount { get; set; }
        public int CashAmount { get; set; }
        public int Gst { get; set; }
        public int NetBillAmount { get; set; }
        public int NetCashAmount { get; set; }
        public int FinalAmount { get; set; }
        public int DeadlineDays { get; set; }
        public DateTime DeadlineDate { get; set; }
        public List<PaymentInput>? Payments { get; set; }
    }

    public class PolishSaleInput
    {
        public int SellingNo { get; set; }
        public DateTime SellingDate { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? Dalal { get; set; }
        public int Pieces { get; set; }
        public decimal Carat { get; set; }
        public string? CurrencyType { get; set; }
        public int? TotalDollar { get; set; }
        public decimal? DollarRate { get; set; }
        public int Price { get; set; }
        public int TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public int DiscountedAmount { get; set; }
        public decimal Dalali { get; set; }
        public int DalaliAmount { get; set; }
        public decimal BillPercentage { get; set; }
        public int BillAmount { get; set; }
        public int CashAmount { get; set; }
        public int Gst { get; set; }
        public int NetBillAmount { get; set; }
        public int NetCashAmount { get; set; }
        public int FinalAmount { get; set; }
        public int DeadlineDays { get; set; }
        public DateTime DeadlineDate { get; set; }
        public string? LotId { get; set; }
        public string SourceLocation { get; set; } = "Surat";
        public string? IssueNo { get; set; }
        public List<PaymentInput>? Payments { get; set; }
    }

    public class ConversionInput
    {
        public DateTime ConversionDate { get; set; }
        public int RoughPieces { get; set; }
        public int PolishPieces { get; set; }
        public string? Remarks { get; set; }
    }

    public class BoxInput
    {
        public string IdNo { get; set; } = string.Empty;
        public string IdChar { get; set; } = string.Empty;
        public int IdNum { get; set; }
        public string Shape1 { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Purity { get; set; } = string.Empty;
        public string Mm { get; set; } = string.Empty;
        public string Shape2 { get; set; } = string.Empty;
        public decimal Carat { get; set; }
        public int MPrice { get; set; }
        public int MValue { get; set; }
    }

    public class BoxSaleItemInput
    {
        public string BoxId { get; set; } = string.Empty;
        public decimal Carat { get; set; }
        public int MPrice { get; set; }
        public int MValue { get; set; }
    }

    public class BoxSaleInput
    {
        public int SellingNo { get; set; }
        public DateTime SellingDate { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? Dalal { get; set; }
        public string? CurrencyType { get; set; }
        public int? TotalDollar { get; set; }
        public decimal? DollarRate { get; set; }
        public int Price { get; set; }
        public int TotalPrice { get; set; }
        public decimal Discount { get; set; }
        public int DiscountedAmount { get; set; }
        public decimal Dalali { get; set; }
        public int DalaliAmount { get; set; }
        public decimal BillPercentage { get; set; }
        public int BillAmount { get; set; }
        public int CashAmount { get; set; }
        public int Gst { get; set; }
        public int NetBillAmount { get; set; }
        public int NetCashAmount { get; set; }
        public int FinalAmount { get; set; }
        public int DeadlineDays { get; set; }
        public DateTime DeadlineDate { get; set; }
        public List<BoxSaleItemInput>? Items { get; set; }
        public List<PaymentInput>? Payments { get; set; }
    }

    public class TransferInput
    {
        public string TransferNo { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string ItemType { get; set; } = string.Empty;
        public string FromLocation { get; set; } = string.Empty;
        public string ToLocation { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public string? LotId { get; set; }
        public int Quantity { get; set; }
        public List<string>? BoxIds { get; set; }
    }

    public class VendorInput
    {
        public string VendorId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string VendorType { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
    }

    public class VendorIssueItemInput
    {
        public string Type { get; set; } = string.Empty;
        public string? LotId { get; set; }
        public int Quantity { get; set; }
        public string? Id { get; set; } // boxId
    }

    public class VendorIssueInput
    {
        public string IssueNo { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string VendorId { get; set; } = string.Empty;
        public List<VendorIssueItemInput>? Items { get; set; }
        public string? Remarks { get; set; }
        public string? Status { get; set; }
    }

    public class ResolveIssueInput
    {
        public string IssueNo { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class AddPaymentInput
    {
        public string PaymentId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public int Amount { get; set; }
        public string? Remarks { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public int TransactionId { get; set; }
    }
}
