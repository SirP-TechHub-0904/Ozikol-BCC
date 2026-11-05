import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

/**
 * Pure Angular Pipe for instant multi-language translation in template bindings.
 * Automatically resolves tokens from the TranslationService dictionary.
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(key: string, fallback?: string): string {
    if (!key) return '';
    return this.translationService.translate(key, fallback);
  }
}
