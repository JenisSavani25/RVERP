using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "partymaster",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    city = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    mobile = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partymaster", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vendormaster",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    vendor_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    vendor_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    city = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    mobile = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendormaster", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "boxes",
                columns: table => new
                {
                    box_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    id_char = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    id_num = table.Column<int>(type: "integer", nullable: false),
                    shape1 = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    purity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    mm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    shape2 = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    carat = table.Column<decimal>(type: "numeric", nullable: false),
                    m_price = table.Column<int>(type: "integer", nullable: false),
                    m_value = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_boxes", x => x.box_id);
                    table.ForeignKey(
                        name: "FK_boxes_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "conversions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    conversion_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    rough_pieces = table.Column<int>(type: "integer", nullable: false),
                    polish_pieces = table.Column<int>(type: "integer", nullable: false),
                    remarks = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversions", x => x.id);
                    table.ForeignKey(
                        name: "FK_conversions_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "transfers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    transfer_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    item_type = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    from_location = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    to_location = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    remarks = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transfers", x => x.id);
                    table.ForeignKey(
                        name: "FK_transfers_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "boxsales",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    selling_no = table.Column<int>(type: "integer", nullable: false),
                    selling_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    party_id = table.Column<int>(type: "integer", nullable: false),
                    dalal_id = table.Column<int>(type: "integer", nullable: true),
                    currency_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    total_dollar = table.Column<int>(type: "integer", nullable: true),
                    dollar_rate = table.Column<decimal>(type: "numeric", nullable: true),
                    price = table.Column<int>(type: "integer", nullable: false),
                    total_price = table.Column<int>(type: "integer", nullable: false),
                    discount = table.Column<decimal>(type: "numeric", nullable: false),
                    discounted_amount = table.Column<int>(type: "integer", nullable: false),
                    dalali = table.Column<decimal>(type: "numeric", nullable: false),
                    dalali_amount = table.Column<int>(type: "integer", nullable: false),
                    bill_percentage = table.Column<decimal>(type: "numeric", nullable: false),
                    bill_amount = table.Column<int>(type: "integer", nullable: false),
                    cash_amount = table.Column<int>(type: "integer", nullable: false),
                    gst = table.Column<int>(type: "integer", nullable: false),
                    net_bill_amount = table.Column<int>(type: "integer", nullable: false),
                    net_cash_amount = table.Column<int>(type: "integer", nullable: false),
                    final_amount = table.Column<int>(type: "integer", nullable: false),
                    deadline_days = table.Column<int>(type: "integer", nullable: false),
                    deadline_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_boxsales", x => x.id);
                    table.ForeignKey(
                        name: "FK_boxsales_partymaster_party_id",
                        column: x => x.party_id,
                        principalTable: "partymaster",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_boxsales_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_boxsales_vendormaster_dalal_id",
                        column: x => x.dalal_id,
                        principalTable: "vendormaster",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "polishsales",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    selling_no = table.Column<int>(type: "integer", nullable: false),
                    selling_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    party_id = table.Column<int>(type: "integer", nullable: false),
                    dalal_id = table.Column<int>(type: "integer", nullable: true),
                    pieces = table.Column<int>(type: "integer", nullable: false),
                    carat = table.Column<decimal>(type: "numeric", nullable: false),
                    currency_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    total_dollar = table.Column<int>(type: "integer", nullable: true),
                    dollar_rate = table.Column<decimal>(type: "numeric", nullable: true),
                    price = table.Column<int>(type: "integer", nullable: false),
                    total_price = table.Column<int>(type: "integer", nullable: false),
                    discount = table.Column<decimal>(type: "numeric", nullable: false),
                    discounted_amount = table.Column<int>(type: "integer", nullable: false),
                    dalali = table.Column<decimal>(type: "numeric", nullable: false),
                    dalali_amount = table.Column<int>(type: "integer", nullable: false),
                    bill_percentage = table.Column<decimal>(type: "numeric", nullable: false),
                    bill_amount = table.Column<int>(type: "integer", nullable: false),
                    cash_amount = table.Column<int>(type: "integer", nullable: false),
                    gst = table.Column<int>(type: "integer", nullable: false),
                    net_bill_amount = table.Column<int>(type: "integer", nullable: false),
                    net_cash_amount = table.Column<int>(type: "integer", nullable: false),
                    final_amount = table.Column<int>(type: "integer", nullable: false),
                    deadline_days = table.Column<int>(type: "integer", nullable: false),
                    deadline_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    lot_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    source_location = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    issue_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_polishsales", x => x.id);
                    table.ForeignKey(
                        name: "FK_polishsales_partymaster_party_id",
                        column: x => x.party_id,
                        principalTable: "partymaster",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_polishsales_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_polishsales_vendormaster_dalal_id",
                        column: x => x.dalal_id,
                        principalTable: "vendormaster",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "roughbuys",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    buying_no = table.Column<int>(type: "integer", nullable: false),
                    buying_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    party_id = table.Column<int>(type: "integer", nullable: false),
                    dalal_id = table.Column<int>(type: "integer", nullable: true),
                    pieces = table.Column<int>(type: "integer", nullable: false),
                    carat = table.Column<decimal>(type: "numeric", nullable: false),
                    currency_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    total_dollar = table.Column<int>(type: "integer", nullable: true),
                    dollar_rate = table.Column<decimal>(type: "numeric", nullable: true),
                    price = table.Column<int>(type: "integer", nullable: false),
                    total_price = table.Column<int>(type: "integer", nullable: false),
                    discount = table.Column<decimal>(type: "numeric", nullable: false),
                    discounted_amount = table.Column<int>(type: "integer", nullable: false),
                    dalali = table.Column<decimal>(type: "numeric", nullable: false),
                    dalali_amount = table.Column<int>(type: "integer", nullable: false),
                    bill_percentage = table.Column<decimal>(type: "numeric", nullable: false),
                    bill_amount = table.Column<int>(type: "integer", nullable: false),
                    cash_amount = table.Column<int>(type: "integer", nullable: false),
                    gst = table.Column<int>(type: "integer", nullable: false),
                    net_bill_amount = table.Column<int>(type: "integer", nullable: false),
                    net_cash_amount = table.Column<int>(type: "integer", nullable: false),
                    final_amount = table.Column<int>(type: "integer", nullable: false),
                    deadline_days = table.Column<int>(type: "integer", nullable: false),
                    deadline_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roughbuys", x => x.id);
                    table.ForeignKey(
                        name: "FK_roughbuys_partymaster_party_id",
                        column: x => x.party_id,
                        principalTable: "partymaster",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_roughbuys_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_roughbuys_vendormaster_dalal_id",
                        column: x => x.dalal_id,
                        principalTable: "vendormaster",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "roughsales",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    selling_no = table.Column<int>(type: "integer", nullable: false),
                    selling_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    party_id = table.Column<int>(type: "integer", nullable: false),
                    dalal_id = table.Column<int>(type: "integer", nullable: true),
                    pieces = table.Column<int>(type: "integer", nullable: false),
                    carat = table.Column<decimal>(type: "numeric", nullable: false),
                    currency_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    total_dollar = table.Column<int>(type: "integer", nullable: true),
                    dollar_rate = table.Column<decimal>(type: "numeric", nullable: true),
                    price = table.Column<int>(type: "integer", nullable: false),
                    total_price = table.Column<int>(type: "integer", nullable: false),
                    discount = table.Column<decimal>(type: "numeric", nullable: false),
                    discounted_amount = table.Column<int>(type: "integer", nullable: false),
                    bill_percentage = table.Column<decimal>(type: "numeric", nullable: false),
                    bill_amount = table.Column<int>(type: "integer", nullable: false),
                    cash_amount = table.Column<int>(type: "integer", nullable: false),
                    gst = table.Column<int>(type: "integer", nullable: false),
                    net_bill_amount = table.Column<int>(type: "integer", nullable: false),
                    net_cash_amount = table.Column<int>(type: "integer", nullable: false),
                    final_amount = table.Column<int>(type: "integer", nullable: false),
                    deadline_days = table.Column<int>(type: "integer", nullable: false),
                    deadline_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roughsales", x => x.id);
                    table.ForeignKey(
                        name: "FK_roughsales_partymaster_party_id",
                        column: x => x.party_id,
                        principalTable: "partymaster",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_roughsales_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_roughsales_vendormaster_dalal_id",
                        column: x => x.dalal_id,
                        principalTable: "vendormaster",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "vendorissues",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    issue_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    vendor_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    remarks = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendorissues", x => x.id);
                    table.ForeignKey(
                        name: "FK_vendorissues_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_vendorissues_vendormaster_vendor_id",
                        column: x => x.vendor_id,
                        principalTable: "vendormaster",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "polishlots",
                columns: table => new
                {
                    lot_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    buying_no = table.Column<int>(type: "integer", nullable: true),
                    buying_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    party_id = table.Column<int>(type: "integer", nullable: true),
                    dalal_id = table.Column<int>(type: "integer", nullable: true),
                    pieces = table.Column<int>(type: "integer", nullable: false),
                    carat = table.Column<decimal>(type: "numeric", nullable: false),
                    currency_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    total_dollar = table.Column<int>(type: "integer", nullable: true),
                    dollar_rate = table.Column<decimal>(type: "numeric", nullable: true),
                    price = table.Column<int>(type: "integer", nullable: true),
                    total_price = table.Column<int>(type: "integer", nullable: true),
                    discount = table.Column<decimal>(type: "numeric", nullable: true),
                    discounted_amount = table.Column<int>(type: "integer", nullable: true),
                    bill_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    bill_amount = table.Column<int>(type: "integer", nullable: true),
                    cash_amount = table.Column<int>(type: "integer", nullable: true),
                    gst = table.Column<int>(type: "integer", nullable: true),
                    net_bill_amount = table.Column<int>(type: "integer", nullable: true),
                    net_cash_amount = table.Column<int>(type: "integer", nullable: true),
                    final_amount = table.Column<int>(type: "integer", nullable: true),
                    deadline_days = table.Column<int>(type: "integer", nullable: true),
                    deadline_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    conversion_id = table.Column<int>(type: "integer", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_polishlots", x => x.lot_id);
                    table.ForeignKey(
                        name: "FK_polishlots_conversions_conversion_id",
                        column: x => x.conversion_id,
                        principalTable: "conversions",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_polishlots_partymaster_party_id",
                        column: x => x.party_id,
                        principalTable: "partymaster",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_polishlots_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_polishlots_vendormaster_dalal_id",
                        column: x => x.dalal_id,
                        principalTable: "vendormaster",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "boxsaleitems",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    box_sale_id = table.Column<int>(type: "integer", nullable: false),
                    box_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    carat = table.Column<decimal>(type: "numeric", nullable: false),
                    m_price = table.Column<int>(type: "integer", nullable: false),
                    m_value = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_boxsaleitems", x => x.id);
                    table.ForeignKey(
                        name: "FK_boxsaleitems_boxes_box_id",
                        column: x => x.box_id,
                        principalTable: "boxes",
                        principalColumn: "box_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_boxsaleitems_boxsales_box_sale_id",
                        column: x => x.box_sale_id,
                        principalTable: "boxsales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "boxitems",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    box_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    polish_lot_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_boxitems", x => x.id);
                    table.ForeignKey(
                        name: "FK_boxitems_boxes_box_id",
                        column: x => x.box_id,
                        principalTable: "boxes",
                        principalColumn: "box_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_boxitems_polishlots_polish_lot_id",
                        column: x => x.polish_lot_id,
                        principalTable: "polishlots",
                        principalColumn: "lot_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    payment_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    payment_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    payment_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    amount = table.Column<int>(type: "integer", nullable: false),
                    remarks = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    rough_buy_id = table.Column<int>(type: "integer", nullable: true),
                    rough_sale_id = table.Column<int>(type: "integer", nullable: true),
                    polish_lot_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    polish_sale_id = table.Column<int>(type: "integer", nullable: true),
                    box_sale_id = table.Column<int>(type: "integer", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_payments_boxsales_box_sale_id",
                        column: x => x.box_sale_id,
                        principalTable: "boxsales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_polishlots_polish_lot_id",
                        column: x => x.polish_lot_id,
                        principalTable: "polishlots",
                        principalColumn: "lot_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_polishsales_polish_sale_id",
                        column: x => x.polish_sale_id,
                        principalTable: "polishsales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_roughbuys_rough_buy_id",
                        column: x => x.rough_buy_id,
                        principalTable: "roughbuys",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_roughsales_rough_sale_id",
                        column: x => x.rough_sale_id,
                        principalTable: "roughsales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "transferitems",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    transfer_id = table.Column<int>(type: "integer", nullable: false),
                    polish_lot_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    quantity = table.Column<int>(type: "integer", nullable: true),
                    box_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transferitems", x => x.id);
                    table.ForeignKey(
                        name: "FK_transferitems_boxes_box_id",
                        column: x => x.box_id,
                        principalTable: "boxes",
                        principalColumn: "box_id");
                    table.ForeignKey(
                        name: "FK_transferitems_polishlots_polish_lot_id",
                        column: x => x.polish_lot_id,
                        principalTable: "polishlots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "FK_transferitems_transfers_transfer_id",
                        column: x => x.transfer_id,
                        principalTable: "transfers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vendorissueitems",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    issue_id = table.Column<int>(type: "integer", nullable: false),
                    item_type = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    polish_lot_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    quantity = table.Column<int>(type: "integer", nullable: true),
                    box_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendorissueitems", x => x.id);
                    table.ForeignKey(
                        name: "FK_vendorissueitems_boxes_box_id",
                        column: x => x.box_id,
                        principalTable: "boxes",
                        principalColumn: "box_id");
                    table.ForeignKey(
                        name: "FK_vendorissueitems_polishlots_polish_lot_id",
                        column: x => x.polish_lot_id,
                        principalTable: "polishlots",
                        principalColumn: "lot_id");
                    table.ForeignKey(
                        name: "FK_vendorissueitems_vendorissues_issue_id",
                        column: x => x.issue_id,
                        principalTable: "vendorissues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_boxes_created_by",
                table: "boxes",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_boxitems_box_id",
                table: "boxitems",
                column: "box_id");

            migrationBuilder.CreateIndex(
                name: "IX_boxitems_polish_lot_id",
                table: "boxitems",
                column: "polish_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_boxsaleitems_box_id",
                table: "boxsaleitems",
                column: "box_id");

            migrationBuilder.CreateIndex(
                name: "IX_boxsaleitems_box_sale_id",
                table: "boxsaleitems",
                column: "box_sale_id");

            migrationBuilder.CreateIndex(
                name: "IX_boxsales_created_by",
                table: "boxsales",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_boxsales_dalal_id",
                table: "boxsales",
                column: "dalal_id");

            migrationBuilder.CreateIndex(
                name: "IX_boxsales_party_id",
                table: "boxsales",
                column: "party_id");

            migrationBuilder.CreateIndex(
                name: "IX_conversions_created_by",
                table: "conversions",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_payments_box_sale_id",
                table: "payments",
                column: "box_sale_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_created_by",
                table: "payments",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_payments_polish_lot_id",
                table: "payments",
                column: "polish_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_polish_sale_id",
                table: "payments",
                column: "polish_sale_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_rough_buy_id",
                table: "payments",
                column: "rough_buy_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_rough_sale_id",
                table: "payments",
                column: "rough_sale_id");

            migrationBuilder.CreateIndex(
                name: "IX_polishlots_conversion_id",
                table: "polishlots",
                column: "conversion_id");

            migrationBuilder.CreateIndex(
                name: "IX_polishlots_created_by",
                table: "polishlots",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_polishlots_dalal_id",
                table: "polishlots",
                column: "dalal_id");

            migrationBuilder.CreateIndex(
                name: "IX_polishlots_party_id",
                table: "polishlots",
                column: "party_id");

            migrationBuilder.CreateIndex(
                name: "IX_polishsales_created_by",
                table: "polishsales",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_polishsales_dalal_id",
                table: "polishsales",
                column: "dalal_id");

            migrationBuilder.CreateIndex(
                name: "IX_polishsales_party_id",
                table: "polishsales",
                column: "party_id");

            migrationBuilder.CreateIndex(
                name: "IX_roughbuys_created_by",
                table: "roughbuys",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_roughbuys_dalal_id",
                table: "roughbuys",
                column: "dalal_id");

            migrationBuilder.CreateIndex(
                name: "IX_roughbuys_party_id",
                table: "roughbuys",
                column: "party_id");

            migrationBuilder.CreateIndex(
                name: "IX_roughsales_created_by",
                table: "roughsales",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_roughsales_dalal_id",
                table: "roughsales",
                column: "dalal_id");

            migrationBuilder.CreateIndex(
                name: "IX_roughsales_party_id",
                table: "roughsales",
                column: "party_id");

            migrationBuilder.CreateIndex(
                name: "IX_transferitems_box_id",
                table: "transferitems",
                column: "box_id");

            migrationBuilder.CreateIndex(
                name: "IX_transferitems_polish_lot_id",
                table: "transferitems",
                column: "polish_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_transferitems_transfer_id",
                table: "transferitems",
                column: "transfer_id");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_created_by",
                table: "transfers",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_vendorissueitems_box_id",
                table: "vendorissueitems",
                column: "box_id");

            migrationBuilder.CreateIndex(
                name: "IX_vendorissueitems_issue_id",
                table: "vendorissueitems",
                column: "issue_id");

            migrationBuilder.CreateIndex(
                name: "IX_vendorissueitems_polish_lot_id",
                table: "vendorissueitems",
                column: "polish_lot_id");

            migrationBuilder.CreateIndex(
                name: "IX_vendorissues_created_by",
                table: "vendorissues",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_vendorissues_vendor_id",
                table: "vendorissues",
                column: "vendor_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "boxitems");

            migrationBuilder.DropTable(
                name: "boxsaleitems");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "transferitems");

            migrationBuilder.DropTable(
                name: "vendorissueitems");

            migrationBuilder.DropTable(
                name: "boxsales");

            migrationBuilder.DropTable(
                name: "polishsales");

            migrationBuilder.DropTable(
                name: "roughbuys");

            migrationBuilder.DropTable(
                name: "roughsales");

            migrationBuilder.DropTable(
                name: "transfers");

            migrationBuilder.DropTable(
                name: "boxes");

            migrationBuilder.DropTable(
                name: "polishlots");

            migrationBuilder.DropTable(
                name: "vendorissues");

            migrationBuilder.DropTable(
                name: "conversions");

            migrationBuilder.DropTable(
                name: "partymaster");

            migrationBuilder.DropTable(
                name: "vendormaster");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
