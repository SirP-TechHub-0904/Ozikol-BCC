using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OzikolBCC.Persistence.EF.SQL.Migrations
{
    /// <inheritdoc />
    public partial class AddBcpCommitteesIndependentSuite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BcpCommitteeForms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsGlobalDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    FieldsSchemaJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommitteeForms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpCommitteeSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AliasSingular = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    AliasPlural = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SubGroupAliasSingular = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SubGroupAliasPlural = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    LeaderTitleAlias = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SecretaryTitleAlias = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    AllowExternalRegistration = table.Column<bool>(type: "bit", nullable: false),
                    RequireApprovalForExternal = table.Column<bool>(type: "bit", nullable: false),
                    AutoProvisionMemberOnApprove = table.Column<bool>(type: "bit", nullable: false),
                    DefaultExtraInfoFormId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AllowGoogleCloudLinking = table.Column<bool>(type: "bit", nullable: false),
                    AllowAnyMemberReportSubmission = table.Column<bool>(type: "bit", nullable: false),
                    MaxUploadSizeMb = table.Column<int>(type: "int", nullable: false),
                    ReportReminderCadence = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CustomReportMetricsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommitteeSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpWorkstationActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkstationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StationKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MachineName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    UserEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    EventType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ProcessName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    AppDisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    WindowTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: true),
                    FilePath = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: true),
                    ScreenshotUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Details = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpWorkstationActivityLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BcpCommittees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParentCommitteeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CategoryTag = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    MissionStatement = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    MeetingSchedule = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    MeetingLocationOrLink = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CoverBannerUrl = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    IconName = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Visibility = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    MaxCapacity = table.Column<int>(type: "int", nullable: true),
                    AllowExternalRegistration = table.Column<bool>(type: "bit", nullable: false),
                    RequireApproval = table.Column<bool>(type: "bit", nullable: false),
                    ExternalInviteToken = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    ExtraInfoFormId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommittees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpCommittees_BcpCommitteeForms_ExtraInfoFormId",
                        column: x => x.ExtraInfoFormId,
                        principalTable: "BcpCommitteeForms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_BcpCommittees_BcpCommittees_ParentCommitteeId",
                        column: x => x.ParentCommitteeId,
                        principalTable: "BcpCommittees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpCommitteeCloudDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommitteeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OwnerUserProfileId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    OwnerDisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Provider = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    DocumentUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    EmbedUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExternalFileId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    ConnectedAccountEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsPinnedToShelf = table.Column<bool>(type: "bit", nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommitteeCloudDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpCommitteeCloudDocuments_BcpCommittees_CommitteeId",
                        column: x => x.CommitteeId,
                        principalTable: "BcpCommittees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "BcpCommitteeMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommitteeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserProfileId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CustomRoleTitle = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    ExtraInfoResponsesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    AddedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommitteeMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpCommitteeMembers_AspNetUsers_UserProfileId",
                        column: x => x.UserProfileId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BcpCommitteeMembers_BcpCommittees_CommitteeId",
                        column: x => x.CommitteeId,
                        principalTable: "BcpCommittees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpCommitteeRegistrations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommitteeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicantUserProfileId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    IsExternalApplicant = table.Column<bool>(type: "bit", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ExtraInfoResponsesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AttachmentUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ReviewNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommitteeRegistrations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpCommitteeRegistrations_BcpCommittees_CommitteeId",
                        column: x => x.CommitteeId,
                        principalTable: "BcpCommittees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BcpCommitteeReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommitteeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubmittedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    SubmittedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    MeetingDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    RichMinutesContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DecisionsText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActionItemsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AttendanceRollCallJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PresentCount = table.Column<int>(type: "int", nullable: false),
                    ExcusedCount = table.Column<int>(type: "int", nullable: false),
                    AbsentCount = table.Column<int>(type: "int", nullable: false),
                    CustomMetricsValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UploadedFilesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CloudLinksJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AiExecutiveDigest = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    AdminRemarks = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    ReviewedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsSharedWithMembers = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BcpCommitteeReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BcpCommitteeReports_BcpCommittees_CommitteeId",
                        column: x => x.CommitteeId,
                        principalTable: "BcpCommittees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeCloudDocuments_CommitteeId_IsPinnedToShelf",
                table: "BcpCommitteeCloudDocuments",
                columns: new[] { "CommitteeId", "IsPinnedToShelf" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeCloudDocuments_OwnerUserProfileId",
                table: "BcpCommitteeCloudDocuments",
                column: "OwnerUserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeMembers_CommitteeId_UserProfileId",
                table: "BcpCommitteeMembers",
                columns: new[] { "CommitteeId", "UserProfileId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeMembers_UserProfileId",
                table: "BcpCommitteeMembers",
                column: "UserProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeRegistrations_CommitteeId_Status_SubmittedAt",
                table: "BcpCommitteeRegistrations",
                columns: new[] { "CommitteeId", "Status", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeReports_CommitteeId_MeetingDate",
                table: "BcpCommitteeReports",
                columns: new[] { "CommitteeId", "MeetingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommitteeReports_ReviewStatus",
                table: "BcpCommitteeReports",
                column: "ReviewStatus");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommittees_ExtraInfoFormId",
                table: "BcpCommittees",
                column: "ExtraInfoFormId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommittees_ParentCommitteeId",
                table: "BcpCommittees",
                column: "ParentCommitteeId");

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommittees_Slug",
                table: "BcpCommittees",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BcpCommittees_Status_Visibility",
                table: "BcpCommittees",
                columns: new[] { "Status", "Visibility" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BcpCommitteeCloudDocuments");

            migrationBuilder.DropTable(
                name: "BcpCommitteeMembers");

            migrationBuilder.DropTable(
                name: "BcpCommitteeRegistrations");

            migrationBuilder.DropTable(
                name: "BcpCommitteeReports");

            migrationBuilder.DropTable(
                name: "BcpCommitteeSettings");

            migrationBuilder.DropTable(
                name: "BcpWorkstationActivityLogs");

            migrationBuilder.DropTable(
                name: "BcpCommittees");

            migrationBuilder.DropTable(
                name: "BcpCommitteeForms");
        }
    }
}
