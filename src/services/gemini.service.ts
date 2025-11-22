import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { environment } from '../environments/environment';
import { StorySegment } from '../models/story.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is injected via environment variables.
    // Do not hardcode the API key in the code.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY environment variable not set.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateStory(pageCount: number): Promise<StorySegment[]> {
    const prompt = `یک داستان ${pageCount} قسمتی برای کتاب کودکان بنویس. داستان در مورد مسابقه ماشین‌رانی بین یک خرگوش سریع به نام "تیزپا"، یک لاک‌پشت آرام و مصمم به نام "سنگی" و یک گربه زرنگ به نام "برقی" است. دوستانشان که برای تشویق آمده‌اند شامل یک خرس مهربان به نام "پشمالو"، یک راسوی بازیگوش، یک پلنگ قوی و یک فیل بزرگ هستند. داستان باید مفاهیم مهمی مانند مدیریت خشم وقتی ماشین خراب می‌شود، حس شکست، شادی پیروزی و اهمیت کمک به دوستان در مواقع سختی را به زبان ساده و کودکانه آموزش دهد. هر قسمت از داستان باید برای یک صفحه از کتاب باشد و حدود 50 تا 80 کلمه باشد.`;
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              page: {
                type: Type.INTEGER,
                description: 'شماره صفحه',
              },
              text: {
                type: Type.STRING,
                description: 'متن داستان برای این صفحه',
              },
            },
            required: ['page', 'text'],
          },
        },
      },
    });

    try {
      const jsonText = response.text.trim();
      const story = JSON.parse(jsonText) as StorySegment[];
      return story.sort((a, b) => a.page - b.page);
    } catch (e) {
      console.error('Failed to parse story JSON:', response.text);
      throw new Error('Could not understand the story received from the AI.');
    }
  }

  async generateImageForStory(storyText: string): Promise<string> {
    const prompt = `Vibrant and colorful children's book illustration, in a whimsical and charming style. The scene is based on this text: "${storyText}".
The main characters are driving cute, cartoonish racing cars inspired by the design of a BMW Z4 sports car.
- A cute rabbit is in a bright yellow racing car with the number 1 on it.
- A friendly turtle is in a sturdy green racing car with the number 7 on it.
- A clever cat is in a sleek blue racing car with the number 5 on it.

The appearance, color, and design of these specific cars (BMW Z4 inspired, specific colors, and numbers) MUST remain consistent across all generated images.
Their friends (a bear, skunk, panther, and elephant) might be in the background.
The art style must be cheerful, friendly, and appealing to young children.
IMPORTANT: Absolutely no text, letters, or words are allowed in the image. The only numbers visible should be 1, 7, and 5 on their respective cars.`;

    const response = await this.ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error('Image generation failed.');
    }
  }
}