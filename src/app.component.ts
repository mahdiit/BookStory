import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { Page } from './models/page.model';
import { StorySegment } from './models/story.model';

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
    this.generateStoryAndImages();
  }

  async generateStoryAndImages(): Promise<void> {
    this.status.set('generating');
    this.errorMessage.set('');
    this.currentPageIndex.set(0);
    this.pages.set([]);

    try {
      this.generationMessage.set('در حال نوشتن داستان...');
      const storySegments = await this.geminiService.generateStory(this.totalPages);

      if (!storySegments || storySegments.length !== this.totalPages) {
        throw new Error('داستان به طور کامل دریافت نشد.');
      }
      
      const initialPages: Page[] = storySegments.map(s => ({ text: s.text, imageUrl: '' }));
      this.pages.set(initialPages);
      
      this.status.set('ready'); // Show the book with text first

      for (let i = 0; i < this.totalPages; i++) {
        this.generationMessage.set(`در حال نقاشی صفحه ${i + 1} از ${this.totalPages}...`);
        
        // Temporarily set status to generating for image loading indication
        const originalStatus = this.status();
        if (i > 0) this.status.set('generating');
        
        const imageUrl = await this.geminiService.generateImageForStory(storySegments[i].text);
        
        this.pages.update(pages => {
          const newPages = [...pages];
          newPages[i].imageUrl = imageUrl;
          return newPages;
        });

        if (i > 0) this.status.set(originalStatus);
      }
      this.generationMessage.set('کتاب شما آماده است!');

    } catch (error) {
      console.error('Error generating story and images:', error);
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
