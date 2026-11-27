import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
  ViewChild,
  Optional
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import {
  ALL_COUNTRY_PHONES,
  CountryPhoneOption,
  resolveDefaultCountryCode,
  cleanPhoneNumber,
  splitPhoneNumber,
  searchCountries
} from '../../../core/utils/phone-cleaner.util';

/**
 * Enterprise Searchable International Phone Input Component.
 * Supports all 232 countries/territories with real-time typeahead search,
 * auto-stripping of pasted country prefixes, leading trunk zero ('0') tolerance,
 * and standard E.164 canonical output (+2348031234567).
 */
@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="phone-input-root" [class.is-disabled]="disabled" [class.is-open]="isDropdownOpen">
      <div class="phone-combo-bar">
        <!-- 1. Country Selector Trigger Button -->
        <button
          type="button"
          class="country-trigger-btn"
          [disabled]="disabled"
          (click)="toggleDropdown($event)"
          [attr.aria-expanded]="isDropdownOpen"
          aria-label="Select Country Calling Code"
          title="Click to search from 230+ countries"
        >
          <span class="country-flag">{{ selectedCountry.flag }}</span>
          <span class="country-code">{{ selectedCountry.code }}</span>
          <span class="material-symbols-outlined trigger-arrow">
            {{ isDropdownOpen ? 'arrow_drop_up' : 'arrow_drop_down' }}
          </span>
        </button>

        <!-- 2. National Phone Input Field -->
        <div class="national-input-wrapper">
          <input
            #nationalInputRef
            type="tel"
            class="national-phone-input"
            [id]="inputId"
            [name]="inputName"
            [disabled]="disabled"
            [required]="required"
            [(ngModel)]="nationalNumber"
            (ngModelChange)="onNationalNumberChange()"
            (paste)="onNationalPaste($event)"
            [placeholder]="selectedCountry.samplePlaceholder"
            autocomplete="tel-national"
          />
        </div>
      </div>

      <!-- 3. Subtext Guidance -->
      <div class="phone-guidance-hint">
        Enter local number (with or without leading 0). Do not re-enter {{ selectedCountry.code }}.
      </div>

      <!-- 4. Searchable Typeahead Dropdown (232 Countries) -->
      <div *ngIf="isDropdownOpen" class="country-dropdown-popover" (click)="$event.stopPropagation()">
        <!-- Search bar inside dropdown -->
        <div class="search-bar-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            #searchFilterInput
            type="text"
            class="dropdown-search-input"
            placeholder="Type country name, ISO, or code (e.g. Nig, +44, US)..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            (keydown)="onSearchKeydown($event)"
            autocomplete="off"
          />
          <button
            *ngIf="searchQuery"
            type="button"
            class="btn-clear-search"
            (click)="clearSearch()"
            aria-label="Clear search"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Filtered country list -->
        <div class="country-list-scroll">
          <div
            *ngFor="let country of filteredCountries; let i = index"
            class="country-option-item"
            [class.selected]="country.code === selectedCountry.code && country.iso === selectedCountry.iso"
            [class.focused]="i === highlightedIndex"
            (click)="selectCountry(country)"
          >
            <span class="option-flag">{{ country.flag }}</span>
            <span class="option-name">{{ country.name }}</span>
            <span class="option-iso">({{ country.iso }})</span>
            <span class="option-code">{{ country.code }}</span>
          </div>

          <div *ngIf="filteredCountries.length === 0" class="no-results-msg">
            <span class="material-symbols-outlined">travel_explore</span>
            <span>No matching country found for "{{ searchQuery }}".</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }
    .phone-input-root {
      position: relative;
      width: 100%;
    }
    .phone-input-root.is-disabled {
      opacity: 0.65;
      pointer-events: none;
    }
    .phone-combo-bar {
      display: flex;
      align-items: stretch;
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      background: #ffffff;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .phone-input-root.is-open .phone-combo-bar,
    .phone-combo-bar:focus-within {
      border-color: #0050e5;
      box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.12);
    }

    /* Country Trigger Button */
    .country-trigger-btn {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      background: #f8fafc;
      border: none;
      border-right: 1px solid #cbd5e1;
      border-radius: 8px 0 0 8px;
      font-size: 13.5px;
      font-weight: 700;
      color: #1e293b;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;
      outline: none;
      min-width: 115px;
    }
    .country-trigger-btn:hover:not(:disabled) {
      background: #f1f5f9;
    }
    .country-flag {
      font-size: 17px;
      line-height: 1;
    }
    .country-code {
      font-family: inherit;
      color: #0f172a;
    }
    .trigger-arrow {
      font-size: 18px;
      color: #64748b;
      margin-left: auto;
    }

    /* National Input Field */
    .national-input-wrapper {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
    }
    .national-phone-input {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      border: none;
      border-radius: 0 8px 8px 0;
      font-size: 13.5px;
      color: #0f172a;
      background: transparent;
      outline: none;
      box-sizing: border-box;
      font-family: inherit;
    }
    .national-phone-input::placeholder {
      color: #94a3b8;
    }

    /* Subtext Guidance Hint */
    .phone-guidance-hint {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.4;
    }

    /* Searchable Dropdown Popover */
    .country-dropdown-popover {
      position: absolute;
      top: calc(100% - 16px);
      left: 0;
      width: 100%;
      max-width: 380px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.2), 0 4px 12px rgba(15, 23, 42, 0.08);
      z-index: 1050;
      overflow: hidden;
      animation: popoverFadeIn 0.15s ease-out;
    }
    @keyframes popoverFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .search-bar-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .search-icon {
      font-size: 18px;
      color: #64748b;
    }
    .dropdown-search-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12.5px;
      outline: none;
      background: #ffffff;
      color: #0f172a;
      font-family: inherit;
    }
    .dropdown-search-input:focus {
      border-color: #0050e5;
      box-shadow: 0 0 0 2px rgba(0, 80, 229, 0.15);
    }
    .btn-clear-search {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: #94a3b8;
      display: flex;
      align-items: center;
    }
    .btn-clear-search:hover {
      color: #334155;
    }
    .btn-clear-search span {
      font-size: 16px;
    }

    /* Scrollable country list */
    .country-list-scroll {
      max-height: 250px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 4px 0;
    }
    .country-option-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      font-size: 13px;
      color: #1e293b;
      cursor: pointer;
      transition: background 0.12s ease;
      user-select: none;
    }
    .country-option-item:hover,
    .country-option-item.focused {
      background: #eff6ff;
      color: #0050e5;
    }
    .country-option-item.selected {
      background: #f0fdf4;
      font-weight: 700;
      color: #15803d;
    }
    .option-flag {
      font-size: 16px;
      line-height: 1;
    }
    .option-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .option-iso {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
    }
    .option-code {
      font-weight: 700;
      color: #0050e5;
      font-size: 12.5px;
      margin-left: auto;
    }

    .no-results-msg {
      padding: 24px 16px;
      text-align: center;
      color: #64748b;
      font-size: 12.5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .no-results-msg span.material-symbols-outlined {
      font-size: 28px;
      color: #94a3b8;
    }

    @media (max-width: 600px) {
      .country-dropdown-popover {
        position: fixed;
        top: 20%;
        left: 5%;
        width: 90%;
        max-width: none;
        z-index: 2000;
      }
    }
  `]
})
export class PhoneInputComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() inputId: string = 'phone_input_' + Math.random().toString(36).substring(2, 7);
  @Input() inputName: string = 'phoneNumber';
  @Input() defaultCurrency?: string;
  @Input() defaultCountry?: string;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;

  @Input()
  get phoneNumber(): string {
    return this.canonicalValue;
  }
  set phoneNumber(val: string) {
    if (val !== this.canonicalValue) {
      this.writeValue(val);
    }
  }
  @Output() phoneNumberChange = new EventEmitter<string>();

  @ViewChild('searchFilterInput') searchFilterInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nationalInputRef') nationalInputRef?: ElementRef<HTMLInputElement>;

  countries: CountryPhoneOption[] = ALL_COUNTRY_PHONES;
  filteredCountries: CountryPhoneOption[] = ALL_COUNTRY_PHONES;

  selectedCountry: CountryPhoneOption = ALL_COUNTRY_PHONES[0];
  nationalNumber: string = '';
  canonicalValue: string = '';

  isDropdownOpen: boolean = false;
  searchQuery: string = '';
  highlightedIndex: number = -1;

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly elementRef: ElementRef,
    @Optional() private readonly settingsService?: SettingsService
  ) {}

  ngOnInit(): void {
    this.applyDefaultCountry();

    // Listen to regional settings changes if not explicitly overridden by parent
    if (this.settingsService?.regional$) {
      this.settingsService.regional$.subscribe((reg) => {
        if (!this.defaultCountry && !this.defaultCurrency && !this.canonicalValue) {
          this.applyDefaultCountry();
        }
      });
    }
  }

  private applyDefaultCountry(): void {
    const regional = this.settingsService?.currentRegional;
    const target = this.defaultCountry || regional?.operatingCountry || this.defaultCurrency || regional?.currencyCode || 'GB';
    const defaultCode = resolveDefaultCountryCode(target);
    const found = this.countries.find(c => c.code === defaultCode);
    if (found) {
      this.selectedCountry = found;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['defaultCurrency'] || changes['defaultCountry']) && !this.canonicalValue) {
      this.applyDefaultCountry();
    }
  }

  writeValue(value: any): void {
    if (!value) {
      this.canonicalValue = '';
      this.nationalNumber = '';
      return;
    }

    const str = String(value).trim();
    this.canonicalValue = str;

    const split = splitPhoneNumber(str, this.defaultCurrency);
    const country = this.countries.find(c => c.code === split.countryCode) || this.selectedCountry;
    this.selectedCountry = country;
    this.nationalNumber = split.nationalNumber;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchQuery = '';
      this.filteredCountries = this.countries;
      this.highlightedIndex = -1;
      setTimeout(() => {
        this.searchFilterInput?.nativeElement.focus();
      }, 50);
    }
  }

  selectCountry(country: CountryPhoneOption): void {
    this.selectedCountry = country;
    this.isDropdownOpen = false;
    this.searchQuery = '';
    this.onNationalNumberChange();
    setTimeout(() => {
      this.nationalInputRef?.nativeElement.focus();
    }, 50);
  }

  onSearchChange(): void {
    this.filteredCountries = searchCountries(this.searchQuery, this.countries);
    this.highlightedIndex = this.filteredCountries.length > 0 ? 0 : -1;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange();
    this.searchFilterInput?.nativeElement.focus();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.highlightedIndex < this.filteredCountries.length - 1) {
        this.highlightedIndex++;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.highlightedIndex > 0) {
        this.highlightedIndex--;
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredCountries.length) {
        this.selectCountry(this.filteredCountries[this.highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      this.isDropdownOpen = false;
    }
  }

  onNationalNumberChange(): void {
    const cleaned = cleanPhoneNumber(this.selectedCountry.code, this.nationalNumber);
    if (this.nationalNumber !== cleaned.nationalNumber) {
      this.nationalNumber = cleaned.nationalNumber;
    }
    this.canonicalValue = cleaned.canonicalE164;
    this.onChange(this.canonicalValue);
    this.phoneNumberChange.emit(this.canonicalValue);
  }

  onNationalPaste(event: ClipboardEvent): void {
    setTimeout(() => {
      this.onNationalNumberChange();
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}
