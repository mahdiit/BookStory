import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { Page } from './models/page.model';

type Status = 'generating' | 'ready' | 'error' | 'intro';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly geminiService = inject(GeminiService);

  @ViewChild('bgMusic') bgMusic?: ElementRef<HTMLAudioElement>;

  readonly totalPages = 10;
  status = signal<Status>('intro');
  generationMessage = signal('در حال آماده‌سازی...');
  errorMessage = signal('');
  
  pages = signal<Page[]>([]);
  currentPageIndex = signal(0);
  isMusicMuted = signal(false);

  currentPage = computed(() => this.pages()[this.currentPageIndex()]);
  isFirstPage = computed(() => this.currentPageIndex() === 0);
  isLastPage = computed(() => this.currentPageIndex() === this.totalPages - 1);

  ngOnInit(): void {
    // We start in 'intro' state
  }

  toggleMusic(): void {
    if (this.bgMusic) {
      const audio = this.bgMusic.nativeElement;
      this.isMusicMuted.set(!this.isMusicMuted());
      audio.muted = this.isMusicMuted();
      if (!this.isMusicMuted() && audio.paused) {
        audio.play().catch(e => console.log('Audio play blocked', e));
      }
    }
  }

  async startStory(): Promise<void> {
    if (this.bgMusic && !this.isMusicMuted()) {
      this.bgMusic.nativeElement.play().catch(e => console.log('Audio play blocked', e));
    }
    await this.generateStory();
  }

  async generateStory(): Promise<void> {
    this.status.set('generating');
    this.errorMessage.set('');
    this.currentPageIndex.set(0);
    this.pages.set([]);

    try {
      this.generationMessage.set('در حال نوشتن یک داستان جدید و هیجان‌انگیز...');
      const storySegments = await this.geminiService.generateStory(this.totalPages);

      if (!storySegments || storySegments.length !== this.totalPages) {
        throw new Error('داستان به طور کامل دریافت نشد. لطفاً دوباره تلاش کنید.');
      }
      
      this.generationMessage.set(`در حال نقاشی صفحه 1 از ${this.totalPages}...`);
      
      let firstImageUrl = '';
      try {
        firstImageUrl = await this.geminiService.generateImageForStory(storySegments[0].text, 1);
      } catch (imgError) {
        console.warn(`Failed to generate image for page 1, using placeholder`, imgError);
        firstImageUrl = `https://picsum.photos/seed/storypage0/1280/720`;
      }

      const initialPages: Page[] = storySegments.map((segment, index) => ({
        text: segment.text,
        imageUrl: index === 0 ? firstImageUrl : '',
      }));

      this.pages.set(initialPages);
      this.status.set('ready');
      
      // Generate remaining images in background
      this.generateRemainingImages(storySegments);

    } catch (error) {
      console.error('Error generating story:', error);
      const message = error instanceof Error ? error.message : 'یک خطای ناشناخته رخ داد.';
      this.errorMessage.set(`متاسفانه مشکلی در ساخت کتاب پیش آمد: ${message}`);
      this.status.set('error');
    }
  }

  async generateRemainingImages(storySegments: any[]) {
    for (let i = 1; i < storySegments.length; i++) {
      try {
        const imageUrl = await this.geminiService.generateImageForStory(storySegments[i].text, i + 1);
        this.pages.update(pages => {
          const newPages = [...pages];
          newPages[i] = { ...newPages[i], imageUrl };
          return newPages;
        });
      } catch (error) {
        console.warn(`Failed to generate image for page ${i+1}`, error);
        this.pages.update(pages => {
          const newPages = [...pages];
          newPages[i] = { ...newPages[i], imageUrl: `https://picsum.photos/seed/storypage${i}/1280/720` };
          return newPages;
        });
      }
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
