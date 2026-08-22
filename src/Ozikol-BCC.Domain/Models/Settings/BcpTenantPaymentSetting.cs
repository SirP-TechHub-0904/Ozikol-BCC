using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    /// <summary>
    /// Financial settings, payment gateways (Paystack, PixelPay, Remita), and direct offline bank transfer details.
    /// Authority: Tenant Admin / Tenant SuperAdmin.
    /// </summary>
    public class BcpTenantPaymentSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Master switch to enable/disable dues, fees, and financial features.
        /// </summary>
        public bool PaymentModuleActive { get; set; } = true;

        // ── Paystack Gateway Settings ──
        public bool EnablePaystack { get; set; }

        [StringLength(255)]
        public string? PaystackPublicKey { get; set; }

        [StringLength(255)]
        public string? PaystackSecretKey { get; set; }

        [StringLength(255)]
        public string? PaystackWebhookSecret { get; set; }

        // ── PixelPay Gateway Settings ──
        public bool EnablePixelPay { get; set; }

        [StringLength(255)]
        public string? PixelPayBaseUrl { get; set; }

        [StringLength(255)]
        public string? PixelPayKeyId { get; set; }

        [StringLength(255)]
        public string? PixelPaySecretKey { get; set; }

        [StringLength(255)]
        public string? PixelPaySignature { get; set; }

        [StringLength(10)]
        public string? PixelPayCurrency { get; set; } = "NGN";

        [StringLength(255)]
        public string? PixelPayWebhookSecret { get; set; }

        // ── Remita Gateway Settings ──
        [StringLength(255)]
        public string? RemitaTitle { get; set; }

        public string? RemitaInstruction { get; set; }

        [StringLength(100)]
        public string? RemitaButton { get; set; }

        // ── Direct Offline Bank Transfer Details ──
        [StringLength(255)]
        public string? BankName { get; set; }

        [StringLength(50)]
        public string? AccountNumber { get; set; }

        [StringLength(255)]
        public string? AccountName { get; set; }
    }
}
