using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace liveWebinar.Migrations
{
    /// <inheritdoc />
    public partial class UniqueParticipantConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Participants_UserId",
                table: "Participants");

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "Participants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Participants",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActiveAt",
                table: "Participants",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "Participants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Participants_UserId_WebinarId_Unique",
                table: "Participants",
                columns: new[] { "UserId", "WebinarId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Participants_UserId_WebinarId_Unique",
                table: "Participants");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "Participants");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Participants");

            migrationBuilder.DropColumn(
                name: "LastActiveAt",
                table: "Participants");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "Participants");

            migrationBuilder.CreateIndex(
                name: "IX_Participants_UserId",
                table: "Participants",
                column: "UserId");
        }
    }
}
