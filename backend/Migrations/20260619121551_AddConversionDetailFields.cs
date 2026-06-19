using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddConversionDetailFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "not_polished_carat",
                table: "conversions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "not_polished_pieces",
                table: "conversions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "polished_carat",
                table: "conversions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "rough_buying_no",
                table: "conversions",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "not_polished_carat",
                table: "conversions");

            migrationBuilder.DropColumn(
                name: "not_polished_pieces",
                table: "conversions");

            migrationBuilder.DropColumn(
                name: "polished_carat",
                table: "conversions");

            migrationBuilder.DropColumn(
                name: "rough_buying_no",
                table: "conversions");
        }
    }
}
