import 'package:flutter/material.dart';

/// Central color palette for Ozikol MIS platform.
/// Strictly aligned with Materialdesignui design tokens (#0050e5, #0f172a).
class AppColors {
  AppColors._();

  // Primary Royal Ozikol Brand Colors
  static const Color primary = Color(0xFF0050E5);
  static const Color primaryContainer = Color(0xFFDBE8FF);
  static const Color onPrimary = Colors.white;
  static const Color onPrimaryContainer = Color(0xFF003790);

  // Secondary & Accents
  static const Color secondary = Color(0xFF1F6BFF);
  static const Color secondaryContainer = Color(0xFFCFE0FF);
  static const Color tertiary = Color(0xFF38BDF8); // Cyan sky
  static const Color tertiaryContainer = Color(0xFFF0F9FF);

  // Status & Feedback Colors
  static const Color success = Color(0xFF0AB39C);
  static const Color warning = Color(0xFFF7B84B);
  static const Color error = Color(0xFFF06548);
  static const Color info = Color(0xFF299CDB);

  // Light Theme Surfaces
  static const Color backgroundLight = Color(0xFFF8FAFC); // slate-50
  static const Color surfaceLight = Colors.white;
  static const Color surfaceVariantLight = Color(0xFFF1F5F9); // slate-100
  static const Color onBackgroundLight = Color(0xFF0F172A); // slate-900
  static const Color onSurfaceLight = Color(0xFF0F172A);
  static const Color outlineLight = Color(0xFFE2E8F0); // slate-200

  // Dark Theme Surfaces
  static const Color backgroundDark = Color(0xFF0F172A); // deep slate-900
  static const Color surfaceDark = Color(0xFF1E293B); // slate-800
  static const Color surfaceVariantDark = Color(0xFF334155); // slate-700
  static const Color onBackgroundDark = Color(0xFFF8FAFC);
  static const Color onSurfaceDark = Color(0xFFF8FAFC);
  static const Color outlineDark = Color(0xFF334155);

  // Spatial Glassmorphism Fills & Borders
  static const Color glassLight = Color(0xBF255255); // ~75% white
  static const Color glassBorderLight = Color(0x66FFFFFF); // 40% white border
  static const Color glassDark = Color(0xBF0F172A); // ~75% slate-900
  static const Color glassBorderDark = Color(0x26FFFFFF); // 15% white border

  // Sidebar & Dock Colors
  static const Color dockBackgroundDark = Color(0xFF0B1120);
  static const Color dockBackgroundLight = Color(0xFFEEF2F6);

  // Standard Grayscale Palette
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color gray50 = Color(0xFFF8FAFC);
  static const Color gray100 = Color(0xFFF1F5F9);
  static const Color gray200 = Color(0xFFE2E8F0);
  static const Color gray300 = Color(0xFFCBD5E1);
  static const Color gray400 = Color(0xFF94A3B8);
  static const Color gray500 = Color(0xFF64748B);
  static const Color gray600 = Color(0xFF475569);
  static const Color gray700 = Color(0xFF334155);
  static const Color gray800 = Color(0xFF1E293B);
  static const Color gray900 = Color(0xFF0F172A);
  static const Color gray950 = Color(0xFF020617);

  // Dividers & Borders
  static const Color divider = Color(0xFFE2E8F0);
  static const Color border = Color(0xFFE2E8F0);
}
