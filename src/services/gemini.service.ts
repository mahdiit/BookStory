import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { StorySegment } from '../models/story.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    // Use the platform-provided GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateStory(pageCount: number): Promise<StorySegment[]> {
    const prompt = `Write a ${pageCount}-page interactive children's story in Persian (Farsi).
The story is about a grand animal car race in the "Green Valley".
Characters:
1. "Tizpa" (Rabbit): Fast, wears a red racing suit, drives a bright yellow sports car with number 1.
2. "Sangi" (Turtle): Calm and determined, wears a green helmet, drives a sturdy green off-road car with number 7.
3. "Barghi" (Cat): Clever and quick, wears a blue scarf, drives a sleek blue electric car with number 5.

Supporting characters: "Pashmalu" (Bear), a playful skunk, a strong panther, and a big elephant are cheering from the sidelines.

Themes: Managing anger when a car breaks down, feeling the sting of loss, the joy of winning, and the importance of helping friends in need.
Each page should be 50-80 words.
Return the story as a JSON array of objects with 'page' (number) and 'text' (string).`;
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
                description: 'Page number',
              },
              text: {
                type: Type.STRING,
                description: 'Story text for this page in Persian',
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

  async generateImageForStory(storyText: string, pageNumber: number): Promise<string> {
    // Character Consistency Guide
    const characterGuide = `
CHARACTER BIBLE (STRICT ADHERENCE REQUIRED IN EVERY IMAGE):
1. Tizpa (Rabbit): A WHITE rabbit with long ears. Wearing a RED racing suit. Driving a BRIGHT YELLOW sports car with the number "1" on the side.
2. Sangi (Turtle): A GREEN turtle with a brown shell. Wearing a GREEN helmet. Driving a CHUNKY GREEN off-road car with the number "7" on the side.
3. Barghi (Cat): An ORANGE tabby cat with pointy ears. Wearing a BLUE scarf. Driving a SLEEK BLUE electric car with the number "5" on the side.

STYLE: 3D Pixar style animation, highly consistent character design, vibrant colors, cute and friendly.
`;

    const prompt = `${characterGuide}
SCENE DESCRIPTION: ${storyText}
This is page ${pageNumber} of the book. 
CRITICAL INSTRUCTION: Ensure the characters and their specific cars (colors, animal types, and numbers) match the guide EXACTLY. Do not change their colors or cars.
NO TEXT, LETTERS, OR WORDS in the image except the numbers 1, 7, and 5 on the cars.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: '16:9',
        },
      },
    });

    // Find the image part in the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error('Image generation failed: No image data returned.');
  }
}
