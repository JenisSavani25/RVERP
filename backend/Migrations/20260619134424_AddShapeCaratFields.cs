using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddShapeCaratFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "carat",
                table: "vendorissueitems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "carat",
                table: "transferitems",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "shape_name",
                table: "polishsales",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "carat",
                table: "vendorissueitems");

            migrationBuilder.DropColumn(
                name: "carat",
                table: "transferitems");

            migrationBuilder.DropColumn(
                name: "shape_name",
                table: "polishsales");
        }
    }
}
