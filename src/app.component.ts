import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { Page } from './models/page.model';

type Status = 'generating' | 'ready' | 'error';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly geminiService = inject(GeminiService);

  readonly totalPages = 10;
  status = signal<Status>('generating');
  generationMessage = signal('در حال نوشتن یک داستان جدید...');
  errorMessage = signal('');
  
  pages = signal<Page[]>([]);
  currentPageIndex = signal(0);

  currentPage = computed(() => this.pages()[this.currentPageIndex()]);
  isFirstPage = computed(() => this.currentPageIndex() === 0);
  isLastPage = computed(() => this.currentPageIndex() === this.totalPages - 1);

  ngOnInit(): void {
    this.generateStory();
  }

  async generateStory(): Promise<void> {
    this.status.set('generating');
    this.errorMessage.set('');
    this.currentPageIndex.set(0);
    this.pages.set([]);

    try {
      this.generationMessage.set('در حال نوشتن یک داستان جدید...');
      const storySegments = await this.geminiService.generateStory(this.totalPages);

      if (!storySegments || storySegments.length !== this.totalPages) {
        throw new Error('داستان به طور کامل دریافت نشد.');
      }
      
      const finalPages: Page[] = [];

      for (let i = 0; i < storySegments.length; i++) {
        this.generationMessage.set(`در حال ساخت تصویر ${i + 1} از ${this.totalPages}...`);
        const segment = storySegments[i];
        const imageUrl = await this.geminiService.generateImageForStory(segment.text);
        finalPages.push({
          text: segment.text,
          imageUrl: imageUrl,
        });
      }

      this.pages.set(finalPages);
      this.status.set('ready');
      this.generationMessage.set('کتاب شما آماده است!');

    } catch (error) {
      console.error('Error generating story:', error);
      const message = error instanceof Error ? error.message : 'یک خطای ناشناخته رخ داد.';
      this.errorMessage.set(`متاسفانه مشکلی پیش آمد: ${message}`);
      this.status.set('error');
    }
  }

  nextPage(): void {
    if (!this.isLastPage()) {
      this.currentPageIndex.update(i => i + 1);
    }
  }

  previousPage(): void {
    if (!this.isFirstPage()) {
      this.currentPageIndex.update(i => i - 1);
    }
  }
}