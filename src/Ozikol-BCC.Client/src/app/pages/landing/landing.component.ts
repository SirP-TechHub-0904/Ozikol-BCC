import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';

interface BrandInfo {
  companyName: string;
  companyNameAbbreviation?: string;
  companyLogoUrl?: string;
  companyIconUrl?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companySlogan?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
}

interface StoreSettings {
  storefrontEnabled: boolean;
  storeTitle: string;
  storeOperatingMode: string;
  currencyCode: string;
  currencySymbol: string;
  showInNavbar: boolean;
  showInFooter: boolean;
  showOnHome: boolean;
  homeProductsCount: number;
}

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="public-site-wrapper" [class.storefront-mode]="storeSettings.storeOperatingMode === 'ecommerce'">
      
      <!-- ============================================== -->
      <!-- TOP NAVIGATION BAR                             -->
      <!-- ============================================== -->
      <header class="site-header">
        <div class="header-inner">
          <!-- Brand Logo & Title -->
          <a routerLink="/" class="brand-area" [title]="brand.companyName">
            <img [src]="brand.companyLogoUrl" [alt]="brand.companyName" class="brand-logo-img" *ngIf="brand.companyLogoUrl" />
            <div class="brand-text-wrap" *ngIf="!brand.companyLogoUrl">
              <span class="material-symbols-outlined brand-default-icon">hub</span>
              <span class="brand-name-text">{{ brand.companyName || 'samson ceo' }}</span>
            </div>
          </a>

          <!-- Desktop Navigation Menu -->
          <nav class="desktop-nav">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link-item">Home</a>
            
            <a href="#about" class="nav-link-item" (click)="scrollToSection('about', $event)">About</a>
            <a href="#features" class="nav-link-item" (click)="scrollToSection('features', $event)">Capabilities</a>

            <!-- Storefront Link (if enabled) -->
            <a routerLink="/store" class="nav-link-item store-link-highlight" *ngIf="storeSettings.storefrontEnabled && storeSettings.showInNavbar">
              <span class="material-symbols-outlined nav-mini-icon">storefront</span>
              <span>{{ storeSettings.storeTitle || 'Store' }}</span>
              <span class="store-badge-new">Catalog</span>
            </a>

            <a href="#faqs" class="nav-link-item" (click)="scrollToSection('faqs', $event)">FAQs</a>
            <a href="#contact" class="nav-link-item" (click)="scrollToSection('contact', $event)">Contact</a>
          </nav>

          <!-- Header Action Buttons -->
          <div class="header-actions">
            <!-- Shopping Cart Quick Access (if store enabled) -->
            <a routerLink="/store/cart" class="header-cart-btn" *ngIf="storeSettings.storefrontEnabled" title="View Shopping Cart">
              <span class="material-symbols-outlined">shopping_bag</span>
              <span class="cart-badge-count" *ngIf="cartService.getItemCount() > 0">{{ cartService.getItemCount() }}</span>
            </a>

            <!-- Portal Login CTA Button -->
            <a routerLink="/auth/login" class="btn-portal-login">
              <span class="material-symbols-outlined">lock_open</span>
              <span>Portal Login</span>
            </a>

            <!-- Mobile Hamburger Toggle -->
            <button type="button" class="mobile-toggle-btn" (click)="mobileMenuOpen = !mobileMenuOpen" [attr.aria-expanded]="mobileMenuOpen">
              <span class="material-symbols-outlined">{{ mobileMenuOpen ? 'close' : 'menu' }}</span>
            </button>
          </div>
        </div>

        <!-- Mobile Drawer Navigation -->
        <div class="mobile-nav-drawer" [class.open]="mobileMenuOpen">
          <div class="mobile-links">
            <a routerLink="/" (click)="mobileMenuOpen = false" class="mobile-link-item">
              <span class="material-symbols-outlined">home</span>
              <span>Home</span>
            </a>
            <a href="#about" (click)="scrollToSection('about', $event); mobileMenuOpen = false;" class="mobile-link-item">
              <span class="material-symbols-outlined">info</span>
              <span>About Us</span>
            </a>
            <a href="#features" (click)="scrollToSection('features', $event); mobileMenuOpen = false;" class="mobile-link-item">
              <span class="material-symbols-outlined">view_quilt</span>
              <span>Platform Capabilities</span>
            </a>
            <a routerLink="/store" (click)="mobileMenuOpen = false" class="mobile-link-item store-mobile-link" *ngIf="storeSettings.storefrontEnabled">
              <span class="material-symbols-outlined">storefront</span>
              <span>{{ storeSettings.storeTitle || 'Online Storefront' }}</span>
              <span class="badge-mini">Shop</span>
            </a>
            <a href="#faqs" (click)="scrollToSection('faqs', $event); mobileMenuOpen = false;" class="mobile-link-item">
              <span class="material-symbols-outlined">help</span>
              <span>Frequently Asked Questions</span>
            </a>
            <a href="#contact" (click)="scrollToSection('contact', $event); mobileMenuOpen = false;" class="mobile-link-item">
              <span class="material-symbols-outlined">mail</span>
              <span>Contact & Support</span>
            </a>
            <div class="mobile-portal-btn-wrap">
              <a routerLink="/auth/login" (click)="mobileMenuOpen = false" class="btn btn-primary btn-block">
                <span class="material-symbols-outlined">dashboard</span>
                <span>Launch Admin / Member Portal</span>
              </a>
            </div>
          </div>
        </div>
      </header>


      <!-- =================================================================== -->
      <!-- MODE 1: STANDARD ORGANIZATION WEBSITE (DEFAULT)                    -->
      <!-- =================================================================== -->
      <main *ngIf="storeSettings.storeOperatingMode !== 'ecommerce'" class="main-content standard-website-layout">
        
        <!-- HERO SECTION -->
        <section class="hero-master-banner">
          <div class="hero-glow-blob"></div>
          <div class="hero-container">
            <div class="hero-text-col">
              <div class="hero-eyebrow-chip">
                <span class="pulse-dot"></span>
                <span>OFFICIAL DIGITAL HUB &bull; {{ brand.companyName || 'ORGANIZATION' }}</span>
              </div>
              <h1 class="hero-main-title">
                {{ brand.companySlogan || 'The Modern Operating System for Forward-Thinking Organizations' }}
              </h1>
              <p class="hero-main-subtitle">
                Welcome to the digital gateway for {{ brand.companyName }}. Seamlessly unifying directory governance, real-time member collaboration channels, dynamic web content, and commerce in one trusted platform.
              </p>
              
              <div class="hero-action-row">
                <a routerLink="/auth/login" class="btn btn-hero-primary">
                  <span class="material-symbols-outlined">login</span>
                  <span>Access Member Portal</span>
                </a>
                <a routerLink="/store" class="btn btn-hero-secondary" *ngIf="storeSettings.storefrontEnabled">
                  <span class="material-symbols-outlined">shopping_cart</span>
                  <span>Explore Store Catalog</span>
                </a>
                <a href="#features" (click)="scrollToSection('features', $event)" class="btn btn-hero-secondary" *ngIf="!storeSettings.storefrontEnabled">
                  <span class="material-symbols-outlined">explore</span>
                  <span>Discover Features</span>
                </a>
              </div>

              <!-- Trust Stats Row -->
              <div class="hero-trust-row">
                <div class="trust-stat-item">
                  <strong class="stat-value">99.9%</strong>
                  <span class="stat-label">Uptime SLA</span>
                </div>
                <div class="trust-stat-sep"></div>
                <div class="trust-stat-item">
                  <strong class="stat-value">256-Bit</strong>
                  <span class="stat-label">Data Security</span>
                </div>
                <div class="trust-stat-sep"></div>
                <div class="trust-stat-item">
                  <strong class="stat-value">Real-Time</strong>
                  <span class="stat-label">WebSocket Sync</span>
                </div>
              </div>
            </div>

            <div class="hero-visual-col">
              <div class="hero-glass-card">
                <div class="glass-card-header">
                  <div class="window-dots">
                    <span class="dot dot-red"></span>
                    <span class="dot dot-yellow"></span>
                    <span class="dot dot-green"></span>
                  </div>
                  <span class="glass-header-title">{{ brand.companyName }} Digital Console</span>
                  <span class="material-symbols-outlined glass-lock-icon">verified_user</span>
                </div>
                <div class="glass-card-body">
                  <div class="glass-metric-box">
                    <div class="metric-top">
                      <span class="metric-label">Institutional Status</span>
                      <span class="metric-badge-live">● Active & Secure</span>
                    </div>
                    <div class="metric-num">Verified Workspace</div>
                  </div>
                  <div class="glass-features-list">
                    <div class="glass-feat-item">
                      <span class="material-symbols-outlined feat-ico text-blue">shield</span>
                      <div class="feat-txt">
                        <strong>Granular RBAC Security</strong>
                        <span>Role-isolated admin permissions & audit logging</span>
                      </div>
                    </div>
                    <div class="glass-feat-item">
                      <span class="material-symbols-outlined feat-ico text-purple">forum</span>
                      <div class="feat-txt">
                        <strong>Real-Time Community Channels</strong>
                        <span>Instant WebSocket collaboration & messaging</span>
                      </div>
                    </div>
                    <div class="glass-feat-item">
                      <span class="material-symbols-outlined feat-ico text-emerald">storefront</span>
                      <div class="feat-txt">
                        <strong>Commercial Retail Engine</strong>
                        <span>Multi-currency payments & digital fulfillment</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        <!-- VALUE PILLARS & CAPABILITIES SECTION -->
        <section id="features" class="section-padded bg-subtle">
          <div class="site-container">
            <div class="section-heading text-center">
              <span class="section-tag">CORE PLATFORM CAPABILITIES</span>
              <h2 class="section-title">Engineered for Performance, Trust & Member Engagement</h2>
              <p class="section-desc">Experience bank-grade reliability, real-time collaboration, and enterprise content publishing tailored for {{ brand.companyName }}.</p>
            </div>

            <div class="pillars-grid">
              <div class="pillar-card">
                <div class="pillar-icon-box bg-blue-subtle">
                  <span class="material-symbols-outlined text-blue">groups_3</span>
                </div>
                <h3 class="pillar-title">Member & Directory Governance</h3>
                <p class="pillar-desc">Comprehensive directory governance with customizable member categorizations, lifecycle status tracking, and automated digital onboarding.</p>
              </div>

              <div class="pillar-card">
                <div class="pillar-icon-box bg-purple-subtle">
                  <span class="material-symbols-outlined text-purple">mark_chat_unread</span>
                </div>
                <h3 class="pillar-title">Real-Time Group Channels</h3>
                <p class="pillar-desc">Collaborative chat rooms and committee channels powered by SignalR socket pipelines with zero-polling latency.</p>
              </div>

              <div class="pillar-card">
                <div class="pillar-icon-box bg-emerald-subtle">
                  <span class="material-symbols-outlined text-emerald">web</span>
                </div>
                <h3 class="pillar-title">Dynamic Website CMS</h3>
                <p class="pillar-desc">Fully database-driven layout sections, hero carousels, customizable component templates, and published institutional pages.</p>
              </div>

              <div class="pillar-card">
                <div class="pillar-icon-box bg-amber-subtle">
                  <span class="material-symbols-outlined text-amber">payments</span>
                </div>
                <h3 class="pillar-title">E-Commerce & Dues Fulfillment</h3>
                <p class="pillar-desc">Integrated online store with digital software downloads, consulting session bookings, physical merchandise, and multi-currency checkout.</p>
              </div>
            </div>
          </div>
        </section>


        <!-- ABOUT OUR ORGANIZATION SECTION -->
        <section id="about" class="section-padded">
          <div class="site-container">
            <div class="about-grid">
              <div class="about-content">
                <span class="section-tag">ABOUT OUR INSTITUTION</span>
                <h2 class="section-title">Two Decades of Trusted Leadership & Digital Innovation</h2>
                <p class="about-paragraph">
                  At <strong>{{ brand.companyName }}</strong>, we are committed to building high-integrity digital infrastructure that empowers member organizations, committee bodies, and stakeholder communities with transparent, reliable tools.
                </p>
                <div class="about-checklist">
                  <div class="check-item">
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>Bank-grade cryptographic security and immutable audit logging.</span>
                  </div>
                  <div class="check-item">
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>Seamless Cloudinary media streaming with global CDN acceleration.</span>
                  </div>
                  <div class="check-item">
                    <span class="material-symbols-outlined check-icon">check_circle</span>
                    <span>24/7 dedicated support team and institutional SLA guarantees.</span>
                  </div>
                </div>
                <div class="about-btn-row">
                  <a routerLink="/auth/login" class="btn btn-primary">
                    <span class="material-symbols-outlined">arrow_forward</span>
                    <span>Learn More in Member Portal</span>
                  </a>
                </div>
              </div>

              <div class="about-media-card">
                <div class="media-card-inner">
                  <span class="material-symbols-outlined institution-icon">account_balance</span>
                  <h3 class="media-card-title">{{ brand.companyName }}</h3>
                  <p class="media-card-sub">{{ brand.companyAddress || 'Enterprise Headquarters' }}</p>
                  <div class="media-contact-chips">
                    <span class="chip-item" *ngIf="brand.companyEmail">
                      <span class="material-symbols-outlined">mail</span>
                      {{ brand.companyEmail }}
                    </span>
                    <span class="chip-item" *ngIf="brand.companyPhone">
                      <span class="material-symbols-outlined">call</span>
                      {{ brand.companyPhone }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        <!-- FEATURED STORE PRODUCTS SHOWCASE (WHEN STORE ENABLED & SHOW ON HOME) -->
        <section id="store-showcase" class="section-padded bg-subtle" *ngIf="storeSettings.storefrontEnabled && storeSettings.showOnHome && featuredProducts.length > 0">
          <div class="site-container">
            <div class="section-heading-row">
              <div>
                <span class="section-tag">COMMERCIAL CATALOG</span>
                <h2 class="section-title">Featured Products & Offerings</h2>
                <p class="section-desc">Explore official merchandise, digital downloads, and premium consulting services from {{ brand.companyName }}.</p>
              </div>
              <a routerLink="/store" class="btn btn-outline">
                <span>View Full Store Catalog</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>

            <div class="products-showcase-grid">
              <div *ngFor="let p of featuredProducts" class="home-product-card">
                <div class="product-media" [routerLink]="['/store/product', p.slug]">
                  <img *ngIf="p.coverImageUrl" [src]="p.coverImageUrl" [alt]="p.title" class="product-img" />
                  <div *ngIf="!p.coverImageUrl" class="product-placeholder">
                    <span class="material-symbols-outlined">shopping_bag</span>
                  </div>
                  <span class="product-type-badge">{{ p.typeName || 'Product' }}</span>
                  <span *ngIf="p.isFeatured" class="badge-featured">★ Top Pick</span>
                </div>
                <div class="product-body">
                  <span class="product-cat">{{ p.categoryTitle || 'General' }}</span>
                  <h4 class="product-title">
                    <a [routerLink]="['/store/product', p.slug]">{{ p.title }}</a>
                  </h4>
                  <div class="product-price-row">
                    <div class="price-wrap">
                      <span class="price-curr">{{ currencySymbol }}{{ p.price | number:'1.2-2' }}</span>
                      <span *ngIf="p.compareAtPrice" class="price-old">{{ currencySymbol }}{{ p.compareAtPrice | number:'1.2-2' }}</span>
                    </div>
                    <button type="button" class="btn-quick-add" (click)="addToCart(p)" title="Add to Cart">
                      <span class="material-symbols-outlined">add_shopping_cart</span>
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        <!-- FREQUENTLY ASKED QUESTIONS SECTION -->
        <section id="faqs" class="section-padded">
          <div class="site-container">
            <div class="section-heading text-center">
              <span class="section-tag">HELP & SUPPORT</span>
              <h2 class="section-title">Frequently Asked Questions</h2>
              <p class="section-desc">Find quick answers to common questions regarding account governance, membership, and orders.</p>
            </div>

            <div class="faqs-accordion-wrapper">
              <div *ngFor="let f of faqs" class="faq-item-card" [class.expanded]="f.expanded">
                <button type="button" class="faq-question-btn" (click)="f.expanded = !f.expanded">
                  <span class="faq-q-text">{{ f.question }}</span>
                  <span class="material-symbols-outlined faq-chevron">{{ f.expanded ? 'expand_less' : 'expand_more' }}</span>
                </button>
                <div class="faq-answer-pane" *ngIf="f.expanded">
                  <p>{{ f.answer }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>


        <!-- NEWSLETTER / COMMUNITY ENGAGEMENT SECTION -->
        <section class="section-padded newsletter-section">
          <div class="site-container">
            <div class="newsletter-card">
              <div class="newsletter-content">
                <span class="material-symbols-outlined newsletter-icon">forward_to_inbox</span>
                <h3 class="newsletter-title">Stay Informed with {{ brand.companyName }}</h3>
                <p class="newsletter-subtitle">Subscribe to receive institutional announcements, quarterly governance reports, and exclusive store discounts.</p>
                <form (submit)="onSubscribeNewsletter($event)" class="newsletter-form">
                  <input type="email" [(ngModel)]="newsletterEmail" name="nlEmail" placeholder="Enter your email address..." required class="newsletter-input" />
                  <button type="submit" class="btn btn-primary newsletter-btn" [disabled]="newsletterSubscribed">
                    <span class="material-symbols-outlined">send</span>
                    <span>{{ newsletterSubscribed ? 'Subscribed!' : 'Subscribe' }}</span>
                  </button>
                </form>
                <span class="newsletter-privacy-hint">🔒 We respect your privacy. Unsubscribe at any time with one click.</span>
              </div>
            </div>
          </div>
        </section>
      </main>


      <!-- =================================================================== -->
      <!-- MODE 2: STOREFRONT FIRST / E-COMMERCE RETAIL HUB                   -->
      <!-- =================================================================== -->
      <main *ngIf="storeSettings.storeOperatingMode === 'ecommerce'" class="main-content storefront-first-layout">
        
        <!-- STOREFRONT PROMO HERO -->
        <section class="store-promo-hero">
          <div class="site-container store-hero-inner">
            <div class="store-hero-left">
              <span class="store-hero-eyebrow">🛍️ OFFICIAL E-COMMERCE STOREFRONT</span>
              <h1 class="store-hero-h1">Explore Products, Software & Specialized Consulting</h1>
              <p class="store-hero-sub">Official digital assets, software licenses, physical goods, and expert bookings with instant checkout and multi-currency support.</p>
              <div class="store-hero-btns">
                <a routerLink="/store" class="btn btn-hero-primary">
                  <span class="material-symbols-outlined">shopping_bag</span>
                  <span>Browse Full Store ({{ totalProductsCount }} Items)</span>
                </a>
                <a routerLink="/store/cart" class="btn btn-hero-secondary">
                  <span class="material-symbols-outlined">shopping_cart</span>
                  <span>View Shopping Cart ({{ cartService.getItemCount() }})</span>
                </a>
              </div>
            </div>
            <div class="store-hero-perks">
              <div class="perk-box">
                <span class="material-symbols-outlined text-blue">verified</span>
                <strong>Direct Delivery</strong>
                <p>Instant digital file access and trackable shipments.</p>
              </div>
              <div class="perk-box">
                <span class="material-symbols-outlined text-emerald">lock</span>
                <strong>Secure Payments</strong>
                <p>Bank-grade SSL card & Paystack checkout.</p>
              </div>
              <div class="perk-box">
                <span class="material-symbols-outlined text-purple">support_agent</span>
                <strong>24/7 Support</strong>
                <p>Direct assistance for orders and downloads.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- STOREFRONT PRODUCTS CATALOG -->
        <section class="section-padded">
          <div class="site-container">
            <div class="section-heading text-center">
              <span class="section-tag">CATALOG INVENTORY</span>
              <h2 class="section-title">All Products & Digital Offerings</h2>
              <p class="section-desc">Select an item below for complete specifications, deliverables, and instant checkout.</p>
            </div>

            <div class="products-showcase-grid">
              <div *ngFor="let p of featuredProducts" class="home-product-card">
                <div class="product-media" [routerLink]="['/store/product', p.slug]">
                  <img *ngIf="p.coverImageUrl" [src]="p.coverImageUrl" [alt]="p.title" class="product-img" />
                  <div *ngIf="!p.coverImageUrl" class="product-placeholder">
                    <span class="material-symbols-outlined">inventory_2</span>
                  </div>
                  <span class="product-type-badge">{{ p.typeName || 'Item' }}</span>
                </div>
                <div class="product-body">
                  <span class="product-cat">{{ p.categoryTitle || 'Catalog' }}</span>
                  <h4 class="product-title">
                    <a [routerLink]="['/store/product', p.slug]">{{ p.title }}</a>
                  </h4>
                  <p class="product-short-desc" *ngIf="p.shortDescription">{{ p.shortDescription }}</p>
                  <div class="product-price-row">
                    <div class="price-wrap">
                      <span class="price-curr">{{ currencySymbol }}{{ p.price | number:'1.2-2' }}</span>
                      <span *ngIf="p.compareAtPrice" class="price-old">{{ currencySymbol }}{{ p.compareAtPrice | number:'1.2-2' }}</span>
                    </div>
                    <button type="button" class="btn-quick-add" (click)="addToCart(p)">
                      <span class="material-symbols-outlined">add_shopping_cart</span>
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="text-center mt-5" *ngIf="featuredProducts.length === 0 && !isLoadingProducts">
              <div class="empty-store-card">
                <span class="material-symbols-outlined empty-icon">inventory_2</span>
                <h3>Storefront Inventory Initializing</h3>
                <p>New products and digital assets are currently being cataloged by the administration.</p>
                <a routerLink="/auth/login" class="btn btn-primary mt-3">Admin Login to Add Products</a>
              </div>
            </div>
          </div>
        </section>
      </main>


      <!-- ============================================== -->
      <!-- CORPORATE PUBLIC FOOTER                        -->
      <!-- ============================================== -->
      <footer id="contact" class="site-footer">
        <div class="site-container">
          <div class="footer-top-grid">
            <!-- Brand Column -->
            <div class="footer-brand-col">
              <div class="footer-brand">
                <img [src]="brand.companyLogoUrl" [alt]="brand.companyName" class="footer-logo-img" *ngIf="brand.companyLogoUrl" />
                <div class="brand-text-wrap" *ngIf="!brand.companyLogoUrl">
                  <span class="material-symbols-outlined brand-default-icon">hub</span>
                  <span class="brand-name-text">{{ brand.companyName || 'samson ceo' }}</span>
                </div>
              </div>
              <p class="footer-bio">
                Empowering organizational leadership, member governance, and digital enterprise with cloud-native security and transparency.
              </p>
              <div class="footer-contact-list">
                <div class="contact-line" *ngIf="brand.companyEmail">
                  <span class="material-symbols-outlined">email</span>
                  <a [href]="'mailto:' + brand.companyEmail">{{ brand.companyEmail }}</a>
                </div>
                <div class="contact-line" *ngIf="brand.companyPhone">
                  <span class="material-symbols-outlined">call</span>
                  <a [href]="'tel:' + brand.companyPhone">{{ brand.companyPhone }}</a>
                </div>
                <div class="contact-line" *ngIf="brand.companyAddress">
                  <span class="material-symbols-outlined">location_on</span>
                  <span>{{ brand.companyAddress }}</span>
                </div>
              </div>
            </div>

            <!-- Col 2: Navigation Links -->
            <div class="footer-links-col">
              <h4 class="footer-heading">Navigation</h4>
              <ul class="footer-link-list">
                <li><a routerLink="/">Home Page</a></li>
                <li><a href="#about" (click)="scrollToSection('about', $event)">About Our Organization</a></li>
                <li><a href="#features" (click)="scrollToSection('features', $event)">Platform Capabilities</a></li>
                <li><a href="#faqs" (click)="scrollToSection('faqs', $event)">Frequently Asked Questions</a></li>
                <li><a routerLink="/auth/login">Member & Admin Portal</a></li>
              </ul>
            </div>

            <!-- Col 3: Solutions & Store Links -->
            <div class="footer-links-col">
              <h4 class="footer-heading">Solutions & Store</h4>
              <ul class="footer-link-list">
                <li *ngIf="storeSettings.storefrontEnabled"><a routerLink="/store">Online Storefront</a></li>
                <li *ngIf="storeSettings.storefrontEnabled"><a routerLink="/store/cart">Shopping Cart ({{ cartService.getItemCount() }})</a></li>
                <li><a routerLink="/auth/login">Identity & Security</a></li>
                <li><a routerLink="/auth/login">Real-Time Group Channels</a></li>
                <li><a routerLink="/auth/login">Committee Dues & Wallets</a></li>
              </ul>
            </div>

            <!-- Col 4: Platform & Legal -->
            <div class="footer-links-col">
              <h4 class="footer-heading">Security & Platform</h4>
              <ul class="footer-link-list">
                <li><a routerLink="/auth/login">Zero-Trust RBAC Console</a></li>
                <li><a routerLink="/auth/login">Cloudinary Media Vault</a></li>
                <li><a routerLink="/auth/login">System Administrator Login</a></li>
                <li><a href="#privacy">Privacy & Data Governance</a></li>
                <li><a href="#terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <!-- Footer Bottom Bar -->
          <div class="footer-bottom-bar">
            <span class="copyright-text">
              &copy; {{ currentYear }} {{ brand.companyName || 'samson ceo' }}. All rights reserved.
            </span>
            <div class="footer-bottom-badges">
              <span class="badge-pill-sec">🔒 256-Bit SSL Encrypted</span>
              <span class="badge-pill-sec">⚡ Powered by Ozikol BCP Multi-Tenant Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .public-site-wrapper {
      min-height: 100vh;
      background: #090d16;
      color: #f8fafc;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* Container Utility */
    .site-container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 24px;
      width: 100%;
      box-sizing: border-box;
    }
    .section-padded {
      padding: 90px 0;
      position: relative;
    }
    .bg-subtle {
      background: #0f172a;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 9px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(0, 80, 229, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #1f6bff, #3b82f6);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.5);
    }
    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }
    .btn-block { width: 100%; }

    /* ============================================== */
    /* HEADER / NAVBAR                                */
    /* ============================================== */
    .site-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(9, 13, 22, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .header-inner {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 24px;
      height: 74px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .brand-area {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: #ffffff;
      gap: 10px;
    }
    .brand-logo-img {
      max-height: 42px;
      width: auto;
      object-fit: contain;
    }
    .brand-text-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-default-icon {
      font-size: 28px;
      color: #38bdf8;
    }
    .brand-name-text {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    .desktop-nav {
      display: flex;
      align-items: center;
      gap: 28px;
    }
    .nav-link-item {
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: color 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .nav-link-item:hover, .nav-link-item.active {
      color: #38bdf8;
    }
    .store-link-highlight {
      color: #818cf8;
    }
    .store-badge-new {
      background: rgba(129, 140, 248, 0.18);
      color: #818cf8;
      border: 1px solid rgba(129, 140, 248, 0.3);
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-cart-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      text-decoration: none;
      transition: all 0.2s;
    }
    .header-cart-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .cart-badge-count {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #0050e5;
      color: #fff;
      font-size: 10.5px;
      font-weight: 800;
      width: 19px;
      height: 19px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 8px rgba(0, 80, 229, 0.8);
    }
    .btn-portal-login {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0, 80, 229, 0.3);
    }
    .btn-portal-login:hover {
      background: #1f6bff;
      transform: translateY(-1px);
    }
    .mobile-toggle-btn {
      display: none;
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      padding: 6px;
    }
    .mobile-nav-drawer {
      display: none;
    }

    /* ============================================== */
    /* HERO SECTION                                   */
    /* ============================================== */
    .hero-master-banner {
      position: relative;
      padding: 100px 0 110px;
      overflow: hidden;
    }
    .hero-glow-blob {
      position: absolute;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 700px;
      height: 400px;
      background: radial-gradient(circle, rgba(0, 80, 229, 0.25) 0%, rgba(56, 189, 248, 0.08) 50%, transparent 70%);
      pointer-events: none;
    }
    .hero-container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 24px;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 50px;
      align-items: center;
      position: relative;
      z-index: 2;
    }
    .hero-eyebrow-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
    }
    .hero-main-title {
      font-size: 46px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.025em;
      margin: 0 0 20px 0;
      color: #ffffff;
    }
    .hero-main-subtitle {
      font-size: 16.5px;
      line-height: 1.65;
      color: #94a3b8;
      margin: 0 0 34px 0;
      max-width: 600px;
    }
    .hero-action-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 44px;
    }
    .btn-hero-primary {
      background: linear-gradient(135deg, #0050e5, #1f6bff);
      color: #fff;
      padding: 14px 28px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14.5px;
      box-shadow: 0 6px 20px rgba(0, 80, 229, 0.4);
    }
    .btn-hero-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 80, 229, 0.6);
    }
    .btn-hero-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #ffffff;
      padding: 14px 26px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14.5px;
    }
    .btn-hero-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }

    .hero-trust-row {
      display: flex;
      align-items: center;
      gap: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .trust-stat-item {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .trust-stat-sep {
      width: 1px;
      height: 28px;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Glass Card Preview */
    .hero-glass-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(20px);
      overflow: hidden;
    }
    .glass-card-header {
      padding: 14px 20px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .window-dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .glass-header-title {
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
    }
    .glass-lock-icon {
      font-size: 18px;
      color: #38bdf8;
    }
    .glass-card-body {
      padding: 24px;
    }
    .glass-metric-box {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .metric-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .metric-label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 600;
    }
    .metric-badge-live {
      font-size: 11px;
      color: #10b981;
      font-weight: 700;
    }
    .metric-num {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
    }
    .glass-features-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .glass-feat-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .feat-ico {
      font-size: 24px;
    }
    .feat-txt strong {
      font-size: 13px;
      color: #ffffff;
      display: block;
    }
    .feat-txt span {
      font-size: 11.5px;
      color: #64748b;
      display: block;
    }

    /* ============================================== */
    /* VALUE PILLARS                                  */
    /* ============================================== */
    .section-heading {
      max-width: 700px;
      margin: 0 auto 56px auto;
    }
    .section-heading.text-center { text-align: center; }
    .section-heading-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 40px;
      flex-wrap: wrap;
      gap: 20px;
    }
    .section-tag {
      font-size: 11.5px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.08em;
      display: block;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 32px;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    .section-desc {
      font-size: 15px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }

    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
    }
    .pillar-card {
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 30px 24px;
      transition: all 0.25s ease;
    }
    .pillar-card:hover {
      transform: translateY(-5px);
      border-color: rgba(56, 189, 248, 0.35);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
    }
    .pillar-icon-box {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .pillar-icon-box span { font-size: 26px; }
    .bg-blue-subtle { background: rgba(56, 189, 248, 0.12); }
    .bg-purple-subtle { background: rgba(168, 85, 247, 0.12); }
    .bg-emerald-subtle { background: rgba(16, 185, 129, 0.12); }
    .bg-amber-subtle { background: rgba(245, 158, 11, 0.12); }
    .text-blue { color: #38bdf8; }
    .text-purple { color: #c084fc; }
    .text-emerald { color: #34d399; }
    .text-amber { color: #fbbf24; }

    .pillar-title {
      font-size: 17.5px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 10px 0;
    }
    .pillar-desc {
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }

    /* ============================================== */
    /* ABOUT US SECTION                               */
    /* ============================================== */
    .about-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 50px;
      align-items: center;
    }
    .about-paragraph {
      font-size: 16px;
      color: #cbd5e1;
      line-height: 1.7;
      margin: 0 0 28px 0;
    }
    .about-checklist {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 34px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14.5px;
      color: #94a3b8;
    }
    .check-icon {
      color: #10b981;
      font-size: 20px;
      flex-shrink: 0;
    }
    .about-media-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .institution-icon {
      font-size: 54px;
      color: #38bdf8;
      margin-bottom: 16px;
    }
    .media-card-title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 6px 0;
    }
    .media-card-sub {
      font-size: 13.5px;
      color: #64748b;
      margin: 0 0 24px 0;
    }
    .media-contact-chips {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }
    .chip-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12.5px;
      color: #94a3b8;
    }
    .chip-item span { font-size: 16px; color: #38bdf8; }

    /* ============================================== */
    /* PRODUCTS SHOWCASE GRID                         */
    /* ============================================== */
    .products-showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 24px;
    }
    .home-product-card {
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.25s ease;
    }
    .home-product-card:hover {
      transform: translateY(-4px);
      border-color: rgba(56, 189, 248, 0.4);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
    }
    .product-media {
      position: relative;
      height: 180px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
    }
    .product-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .home-product-card:hover .product-img {
      transform: scale(1.05);
    }
    .product-placeholder {
      font-size: 48px;
      color: #64748b;
    }
    .product-type-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .badge-featured {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(245, 158, 11, 0.9);
      color: #000;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .product-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-cat {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .product-title {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    .product-title a {
      color: #f8fafc;
      text-decoration: none;
    }
    .product-title a:hover {
      color: #38bdf8;
    }
    .product-short-desc {
      font-size: 12.5px;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0 0 14px 0;
    }
    .product-price-row {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .price-curr {
      font-size: 17px;
      font-weight: 800;
      color: #38bdf8;
    }
    .price-old {
      font-size: 12.5px;
      color: #64748b;
      text-decoration: line-through;
      margin-left: 6px;
    }
    .btn-quick-add {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #0050e5;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-quick-add:hover {
      background: #1f6bff;
    }
    .btn-quick-add span { font-size: 16px; }

    /* ============================================== */
    /* FAQS ACCORDION                                 */
    /* ============================================== */
    .faqs-accordion-wrapper {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .faq-item-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .faq-item-card.expanded {
      border-color: rgba(56, 189, 248, 0.4);
    }
    .faq-question-btn {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 22px;
      background: none;
      border: none;
      color: #f8fafc;
      font-size: 15px;
      font-weight: 700;
      text-align: left;
      cursor: pointer;
    }
    .faq-chevron {
      color: #64748b;
      font-size: 22px;
    }
    .faq-answer-pane {
      padding: 0 22px 18px 22px;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .faq-answer-pane p { margin: 0; }

    /* ============================================== */
    /* NEWSLETTER SECTION                             */
    /* ============================================== */
    .newsletter-card {
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0b1120 100%);
      border: 1.5px solid rgba(56, 189, 248, 0.25);
      border-radius: 20px;
      padding: 50px 30px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .newsletter-content {
      max-width: 650px;
      margin: 0 auto;
    }
    .newsletter-icon {
      font-size: 44px;
      color: #38bdf8;
      margin-bottom: 12px;
    }
    .newsletter-title {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 10px 0;
    }
    .newsletter-subtitle {
      font-size: 15px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 28px 0;
    }
    .newsletter-form {
      display: flex;
      gap: 10px;
      max-width: 500px;
      margin: 0 auto 16px auto;
    }
    .newsletter-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px 16px;
      color: #ffffff;
      font-size: 14px;
    }
    .newsletter-input:focus {
      outline: none;
      border-color: #38bdf8;
    }
    .newsletter-btn {
      flex-shrink: 0;
    }
    .newsletter-privacy-hint {
      font-size: 12px;
      color: #64748b;
    }

    /* ============================================== */
    /* STOREFRONT FIRST MODE LAYOUT                   */
    /* ============================================== */
    .store-promo-hero {
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090d16 80%);
      padding: 80px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .store-hero-inner {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 40px;
      align-items: center;
    }
    .store-hero-eyebrow {
      font-size: 12px;
      font-weight: 800;
      color: #818cf8;
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 12px;
    }
    .store-hero-h1 {
      font-size: 40px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.2;
      margin: 0 0 16px 0;
    }
    .store-hero-sub {
      font-size: 15.5px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 28px 0;
    }
    .store-hero-btns {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .store-hero-perks {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .perk-box {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px 20px;
    }
    .perk-box span { font-size: 24px; margin-bottom: 4px; }
    .perk-box strong { font-size: 14px; color: #ffffff; display: block; }
    .perk-box p { font-size: 12px; color: #94a3b8; margin: 2px 0 0 0; }
    .empty-store-card {
      background: #0f172a;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 50px 20px;
      max-width: 500px;
      margin: 0 auto;
    }
    .empty-icon { font-size: 48px; color: #64748b; margin-bottom: 12px; }

    /* ============================================== */
    /* FOOTER                                         */
    /* ============================================== */
    .site-footer {
      background: #050811;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 70px 0 30px 0;
      margin-top: auto;
    }
    .footer-top-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1.2fr;
      gap: 40px;
      margin-bottom: 50px;
    }
    .footer-brand {
      margin-bottom: 16px;
    }
    .footer-logo-img {
      max-height: 38px;
      width: auto;
    }
    .footer-bio {
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.6;
      max-width: 320px;
      margin-bottom: 20px;
    }
    .footer-contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .contact-line {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #94a3b8;
    }
    .contact-line a {
      color: #94a3b8;
      text-decoration: none;
      transition: color 0.15s;
    }
    .contact-line a:hover {
      color: #38bdf8;
    }
    .contact-line span {
      font-size: 16px;
      color: #38bdf8;
    }

    .footer-heading {
      font-size: 14px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 20px 0;
    }
    .footer-link-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .footer-link-list li a {
      font-size: 13.5px;
      color: #94a3b8;
      text-decoration: none;
      transition: color 0.15s;
    }
    .footer-link-list li a:hover {
      color: #38bdf8;
    }

    .footer-bottom-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 30px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      flex-wrap: wrap;
      gap: 16px;
    }
    .copyright-text {
      font-size: 12.5px;
      color: #64748b;
    }
    .footer-bottom-badges {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .badge-pill-sec {
      font-size: 11.5px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px 10px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* ============================================== */
    /* RESPONSIVE MEDIA QUERIES                       */
    /* ============================================== */
    @media (max-width: 992px) {
      .hero-container {
        grid-template-columns: 1fr;
        text-align: center;
      }
      .hero-main-subtitle { margin: 0 auto 34px auto; }
      .hero-action-row { justify-content: center; }
      .hero-trust-row { justify-content: center; }
      .about-grid { grid-template-columns: 1fr; }
      .footer-top-grid { grid-template-columns: 1fr 1fr; }
      .store-hero-inner { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .desktop-nav { display: none; }
      .mobile-toggle-btn { display: block; }
      .hero-main-title { font-size: 32px; }
      .section-title { font-size: 26px; }
      .footer-top-grid { grid-template-columns: 1fr; }

      .mobile-nav-drawer {
        display: block;
        position: absolute;
        top: 74px;
        left: 0;
        right: 0;
        background: #090d16;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 20px;
        transform: translateY(-100%);
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s ease;
      }
      .mobile-nav-drawer.open {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      .mobile-links {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .mobile-link-item {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #f8fafc;
        text-decoration: none;
        font-size: 15px;
        font-weight: 600;
        padding: 10px 14px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
      }
      .mobile-portal-btn-wrap {
        margin-top: 10px;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  currentYear = new Date().getFullYear();
  mobileMenuOpen = false;
  newsletterEmail = '';
  newsletterSubscribed = false;
  isLoadingProducts = false;
  totalProductsCount = 0;

  brand: BrandInfo = {
    companyName: 'samson ceo',
    companySlogan: 'The Modern Operating System for Forward-Thinking Organizations'
  };

  storeSettings: StoreSettings = {
    storefrontEnabled: true,
    storeTitle: 'Store',
    storeOperatingMode: 'standard',
    currencyCode: 'USD',
    currencySymbol: '$',
    showInNavbar: true,
    showInFooter: true,
    showOnHome: true,
    homeProductsCount: 8
  };

  featuredProducts: any[] = [];

  faqs: FaqItem[] = [
    {
      id: 1,
      question: 'How do I access the Member & Administrative Portal?',
      answer: 'Click on "Portal Login" at the top right of the navigation bar. Use your registered administrator or member email credentials to access your designated workspace, committee channels, and dashboard.',
      expanded: true
    },
    {
      id: 2,
      question: 'How do electronic dues, wallet payments, and store purchases work?',
      answer: 'Our platform supports secure bank-grade card processing, instant bank transfers, and automated wallet reconciliations. All transactions generate immediate digital receipts and update membership status in real time.',
      expanded: false
    },
    {
      id: 3,
      question: 'Can I purchase digital software downloads or consulting packages directly?',
      answer: 'Yes! Explore our integrated Storefront by clicking "Store" in the navigation bar. You can add digital assets, subscriptions, or consulting sessions to your cart and complete checkout with instant receipt generation.',
      expanded: false
    },
    {
      id: 4,
      question: 'How is data security and identity management governed?',
      answer: 'We utilize enterprise Zero-Trust Role-Based Access Control (RBAC), 256-bit encryption in transit and at rest, alongside multi-tenant database isolation to guarantee institutional data sovereignty.',
      expanded: false
    }
  ];

  constructor(
    private api: ApiService,
    public cartService: CartService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBrandSettings();
    this.loadStoreSettings();
    this.loadFeaturedProducts();
    this.loadFaqs();
  }

  loadBrandSettings(): void {
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          this.brand = { ...this.brand, ...res.data };
          if (this.brand.companyName) {
            document.title = `${this.brand.companyName} - Official Portal`;
          }
        }
      },
      error: () => {}
    });
  }

  loadStoreSettings(): void {
    this.api.get<any>('SettingsApi/ecommerce').subscribe({
      next: (res) => {
        if (res?.data) {
          this.storeSettings = { ...this.storeSettings, ...res.data };
        }
      },
      error: () => {}
    });
  }

  loadFeaturedProducts(): void {
    this.isLoadingProducts = true;
    this.api.get<any>('ProductsApi/public/catalog?pageSize=8').subscribe({
      next: (res) => {
        this.isLoadingProducts = false;
        if (res?.data?.items) {
          this.featuredProducts = res.data.items;
          this.totalProductsCount = res.data.totalCount || this.featuredProducts.length;
        }
      },
      error: () => {
        this.isLoadingProducts = false;
      }
    });
  }

  loadFaqs(): void {
    this.api.get<any>('WebsiteContentApi/faqs').subscribe({
      next: (res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          this.faqs = res.data.slice(0, 6).map((f: any, idx: number) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            expanded: idx === 0
          }));
        }
      },
      error: () => {}
    });
  }

  get currencySymbol(): string {
    return this.storeSettings.currencySymbol || '$';
  }

  addToCart(product: any): void {
    this.cartService.addItem(product, 1);
    this.toast.success(`"${product.title}" added to shopping cart.`);
  }

  onSubscribeNewsletter(event: Event): void {
    event.preventDefault();
    if (!this.newsletterEmail || !this.newsletterEmail.includes('@')) {
      this.toast.error('Please provide a valid email address.');
      return;
    }
    this.newsletterSubscribed = true;
    this.toast.success('Thank you for subscribing to our institutional announcements!');
  }

  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
