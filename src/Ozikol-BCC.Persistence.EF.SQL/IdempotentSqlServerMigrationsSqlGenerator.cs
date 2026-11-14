using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Microsoft.EntityFrameworkCore.Update;

namespace Ozikol_BCC.Persistence.EF.SQL;

/// <summary>
/// Idempotent SQL Server migrations SQL generator that wraps DDL schema creation operations
/// (<c>CREATE TABLE</c>, <c>ALTER TABLE ADD</c>, <c>CREATE INDEX</c>, <c>ADD CONSTRAINT FOREIGN KEY</c>,
/// <c>DROP COLUMN</c>, <c>DROP TABLE</c>, <c>DROP INDEX</c>, <c>DROP FOREIGN KEY</c>) in safe
/// metadata existence checks (<c>COL_LENGTH</c>, <c>OBJECT_ID</c>, <c>sys.indexes</c>).
/// Prevents tenant onboarding and batch database upgrades from failing if a table, column, index,
/// or constraint already exists in the target database.
/// </summary>
public sealed class IdempotentSqlServerMigrationsSqlGenerator : SqlServerMigrationsSqlGenerator
{
    /// <summary>
    /// Initializes a new instance of the <see cref="IdempotentSqlServerMigrationsSqlGenerator"/> class.
    /// </summary>
    /// <param name="dependencies">Core EF migrations SQL generator dependencies.</param>
    /// <param name="commandBatchPreparer">Relational command batch preparer.</param>
    public IdempotentSqlServerMigrationsSqlGenerator(
        MigrationsSqlGeneratorDependencies dependencies,
        ICommandBatchPreparer commandBatchPreparer)
        : base(dependencies, commandBatchPreparer)
    {
    }

    /// <inheritdoc />
    protected override void Generate(
        CreateTableOperation operation,
        IModel? model,
        MigrationCommandListBuilder builder,
        bool terminate = true)
    {
        var schema = string.IsNullOrWhiteSpace(operation.Schema) ? "dbo" : operation.Schema;
        var qualifiedTable = $"{Dependencies.SqlGenerationHelper.DelimitIdentifier(schema)}.{Dependencies.SqlGenerationHelper.DelimitIdentifier(operation.Name)}".Replace("'", "''");

        builder.AppendLine($"IF OBJECT_ID(N'{qualifiedTable}', N'U') IS NULL");
        builder.AppendLine("BEGIN");
        using (builder.Indent())
        {
            base.Generate(operation, model, builder, terminate: false);
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
        }
        builder.Append("END");

        if (terminate)
        {
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
            EndStatement(builder);
        }
    }

    /// <inheritdoc />
    protected override void Generate(
        AddColumnOperation operation,
        IModel? model,
        MigrationCommandListBuilder builder,
        bool terminate = true)
    {
        var schema = string.IsNullOrWhiteSpace(operation.Schema) ? "dbo" : operation.Schema;
        var qualifiedTable = $"{Dependencies.SqlGenerationHelper.DelimitIdentifier(schema)}.{Dependencies.SqlGenerationHelper.DelimitIdentifier(operation.Table)}".Replace("'", "''");
        var escapedColumn = operation.Name.Replace("'", "''");

        builder.AppendLine($"IF COL_LENGTH(N'{qualifiedTable}', N'{escapedColumn}') IS NULL");
        builder.AppendLine("BEGIN");
        using (builder.Indent())
        {
            base.Generate(operation, model, builder, terminate: false);
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
        }
        builder.Append("END");

        if (terminate)
        {
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
            EndStatement(builder);
        }
    }

    /// <inheritdoc />
    protected override void Generate(
        CreateIndexOperation operation,
        IModel? model,
        MigrationCommandListBuilder builder,
        bool terminate = true)
    {
        var schema = string.IsNullOrWhiteSpace(operation.Schema) ? "dbo" : operation.Schema;
        var qualifiedTable = $"{Dependencies.SqlGenerationHelper.DelimitIdentifier(schema)}.{Dependencies.SqlGenerationHelper.DelimitIdentifier(operation.Table)}".Replace("'", "''");
        var escapedIndex = operation.Name.Replace("'", "''");

        builder.AppendLine($"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'{escapedIndex}' AND object_id = OBJECT_ID(N'{qualifiedTable}'))");
        builder.AppendLine("BEGIN");
        using (builder.Indent())
        {
            base.Generate(operation, model, builder, terminate: false);
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
        }
        builder.Append("END");

        if (terminate)
        {
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
            EndStatement(builder);
        }
    }

    /// <inheritdoc />
    protected override void Generate(
        AddForeignKeyOperation operation,
        IModel? model,
        MigrationCommandListBuilder builder,
        bool terminate = true)
    {
        var schema = string.IsNullOrWhiteSpace(operation.Schema) ? "dbo" : operation.Schema;
        var qualifiedFk = $"{Dependencies.SqlGenerationHelper.DelimitIdentifier(schema)}.{Dependencies.SqlGenerationHelper.DelimitIdentifier(operation.Name)}".Replace("'", "''");

        builder.AppendLine($"IF OBJECT_ID(N'{qualifiedFk}', N'F') IS NULL");
        builder.AppendLine("BEGIN");
        using (builder.Indent())
        {
            base.Generate(operation, model, builder, terminate: false);
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
        }
        builder.Append("END");

        if (terminate)
        {
            builder.AppendLine(Dependencies.SqlGenerationHelper.StatementTerminator);
            EndStatement(builder);
        }
    }
}

/// <summary>
/// In-memory static validator that inspects all compiled EF Core <see cref="Migration"/> classes
/// in <see cref="DashboardDbContext"/> to detect duplicate <c>CreateTable</c> or <c>AddColumn</c>
/// operations across the migration chain before any SQL is executed.
/// </summary>
public static class MigrationChainIntegrityValidator
{
    /// <summary>
    /// Audits all compiled tenant migrations in chronological order and returns any duplicate
    /// table or column definitions detected across the migration chain.
    /// </summary>
    /// <returns>List of human-readable integrity warnings (empty when 100% clean).</returns>
    public static IReadOnlyList<string> AuditTenantMigrationChain()
    {
        var warnings = new List<string>();
        var activeTables = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var activeColumns = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var migrationTypes = typeof(DashboardDbContext).Assembly
            .GetTypes()
            .Where(t => typeof(Migration).IsAssignableFrom(t) && !t.IsAbstract)
            .Select(t => new
            {
                Type = t,
                MigrationId = t.GetCustomAttribute<MigrationAttribute>()?.Id ?? t.Name
            })
            .OrderBy(x => x.MigrationId, StringComparer.Ordinal)
            .ToList();

        var upMethod = typeof(Migration).GetMethod("Up", BindingFlags.Instance | BindingFlags.NonPublic);
        if (upMethod == null)
        {
            return warnings;
        }

        foreach (var item in migrationTypes)
        {
            if (Activator.CreateInstance(item.Type) is not Migration migrationInstance)
            {
                continue;
            }

            var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
            upMethod.Invoke(migrationInstance, new object[] { builder });

            foreach (var op in builder.Operations)
            {
                switch (op)
                {
                    case CreateTableOperation createTable:
                    {
                        if (activeTables.TryGetValue(createTable.Name, out var existingMigration))
                        {
                            warnings.Add($"Duplicate CreateTable('{createTable.Name}') in '{item.MigrationId}' (already created in '{existingMigration}').");
                        }
                        activeTables[createTable.Name] = item.MigrationId;

                        foreach (var col in createTable.Columns)
                        {
                            var colKey = $"{createTable.Name}.{col.Name}";
                            activeColumns[colKey] = item.MigrationId;
                        }
                        break;
                    }
                    case DropTableOperation dropTable:
                    {
                        activeTables.Remove(dropTable.Name);
                        var prefix = $"{dropTable.Name}.";
                        var colsToRemove = activeColumns.Keys.Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)).ToList();
                        foreach (var k in colsToRemove)
                        {
                            activeColumns.Remove(k);
                        }
                        break;
                    }
                    case RenameTableOperation renameTable when !string.IsNullOrWhiteSpace(renameTable.NewName):
                    {
                        if (activeTables.Remove(renameTable.Name, out var originMig))
                        {
                            activeTables[renameTable.NewName!] = originMig;
                        }
                        var oldPrefix = $"{renameTable.Name}.";
                        var matchingCols = activeColumns.Where(kv => kv.Key.StartsWith(oldPrefix, StringComparison.OrdinalIgnoreCase)).ToList();
                        foreach (var kv in matchingCols)
                        {
                            activeColumns.Remove(kv.Key);
                            var colName = kv.Key.Substring(oldPrefix.Length);
                            activeColumns[$"{renameTable.NewName}.{colName}"] = kv.Value;
                        }
                        break;
                    }
                    case AddColumnOperation addCol:
                    {
                        var colKey = $"{addCol.Table}.{addCol.Name}";
                        if (activeColumns.TryGetValue(colKey, out var existingMigration))
                        {
                            warnings.Add($"Duplicate AddColumn('{colKey}') in '{item.MigrationId}' (already defined in '{existingMigration}').");
                        }
                        activeColumns[colKey] = item.MigrationId;
                        break;
                    }
                    case DropColumnOperation dropCol:
                    {
                        activeColumns.Remove($"{dropCol.Table}.{dropCol.Name}");
                        break;
                    }
                    case RenameColumnOperation renameCol:
                    {
                        var oldKey = $"{renameCol.Table}.{renameCol.Name}";
                        if (activeColumns.Remove(oldKey, out var originMig))
                        {
                            activeColumns[$"{renameCol.Table}.{renameCol.NewName}"] = originMig;
                        }
                        break;
                    }
                }
            }
        }

        return warnings;
    }
}
