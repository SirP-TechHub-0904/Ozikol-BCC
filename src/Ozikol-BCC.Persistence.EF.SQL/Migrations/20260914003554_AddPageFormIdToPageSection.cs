using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddPageFormIdToPageSection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FormKey",
                table: "PageSections",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PageFormId",
                table: "PageSections",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PageSections_PageFormId",
                table: "PageSections",
                column: "PageFormId");

            migrationBuilder.AddForeignKey(
                name: "FK_PageSections_PageForms_PageFormId",
                table: "PageSections",
                column: "PageFormId",
                principalTable: "PageForms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PageSections_PageForms_PageFormId",
                table: "PageSections");

            migrationBuilder.DropIndex(
                name: "IX_PageSections_PageFormId",
                table: "PageSections");

            migrationBuilder.DropColumn(
                name: "FormKey",
                table: "PageSections");

            migrationBuilder.DropColumn(
                name: "PageFormId",
                table: "PageSections");
        }
    }
}
