using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend;

/// <summary>
/// Applies idempotent schema patches then syncs EF migration history.
/// Handles production DBs where columns were added manually via SQL before Migrate() ran.
/// </summary>
public static class DatabaseSchemaBootstrap
{
    private const string EfProductVersion = "8.0.4";

    private static readonly string[] SchemaMigrations =
    [
        "20260619121551_AddConversionDetailFields",
        "20260619125028_AddTransferShapeName",
        "20260619130109_AddVendorIssueShapeName"
    ];

    private static readonly string[] IdempotentColumnSql =
    [
        "ALTER TABLE conversions ADD COLUMN IF NOT EXISTS rough_buying_no integer",
        "ALTER TABLE conversions ADD COLUMN IF NOT EXISTS polished_carat numeric",
        "ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_pieces integer",
        "ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_carat numeric",
        "ALTER TABLE transferitems ADD COLUMN IF NOT EXISTS shape_name character varying(100)",
        "ALTER TABLE vendorissueitems ADD COLUMN IF NOT EXISTS shape_name character varying(100)"
    ];

    public static void Apply(ApplicationDbContext db)
    {
        foreach (var sql in IdempotentColumnSql)
            db.Database.ExecuteSqlRaw(sql);

        foreach (var migrationId in SchemaMigrations)
        {
            db.Database.ExecuteSqlInterpolated($"""
                INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                VALUES ({migrationId}, {EfProductVersion})
                ON CONFLICT ("MigrationId") DO NOTHING
                """);
        }

        db.Database.Migrate();
    }
}
