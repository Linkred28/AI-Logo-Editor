import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this environment, we assume the key is present.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const handleGeminiResponse = (response: any): string => {
    // 1. Check for immediate blocking at the response level
    if (response.promptFeedback?.blockReason) {
      throw new Error(`Request was blocked due to: ${response.promptFeedback.blockReason}. Please adjust your prompt.`);
    }

    // 2. Check if there are any candidates
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("No image content was generated. The API response was empty.");
    }

    // 3. Check the reason the candidate finished
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        const reasonMap: {[key: string]: string} = {
            'SAFETY': 'The request was blocked due to safety concerns. Please modify your prompt or image.',
            'RECITATION': 'The response was blocked due to potential recitation of copyrighted material.',
            'NO_IMAGE': 'The model could not generate an image from your prompt. Please try rephrasing your request to be more specific about the visual changes.',
            'OTHER': 'Generation failed for an unspecified reason from the model.'
        };
        const errorMessage = reasonMap[candidate.finishReason] || `Generation stopped unexpectedly: ${candidate.finishReason}`;
        throw new Error(errorMessage);
    }
    
    // 4. Check if the candidate has the expected content structure
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error("The API response did not contain the expected image format. Please try again.");
    }

    // 5. Find and return the image data
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        // Reconstruct the data URI for display in the browser.
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in the API response.");
};

export const editImageWithGemini = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const pureBase64 = base64ImageData.split(',')[1];
    if (!pureBase64) {
        throw new Error("Invalid base64 image data provided.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: pureBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    return handleGeminiResponse(response);

  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};


export const createImageWithGemini = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    return handleGeminiResponse(response);

  } catch (error) {
    console.error("Error creating image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};