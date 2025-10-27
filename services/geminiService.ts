import { GoogleGenAI, Modality, Type, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const handleImageGenerationResponse = (response: any): string => {
    if (response.promptFeedback?.blockReason) {
      throw new Error(`Request was blocked due to: ${response.promptFeedback.blockReason}. Please adjust your prompt.`);
    }
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("No image content was generated. The API response was empty.");
    }
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
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error("The API response did not contain the expected image format. Please try again.");
    }
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in the API response.");
};

const generateImageFromParts = async (parts: Part[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    return handleImageGenerationResponse(response);
  } catch (error) {
    console.error("Error generating image from parts:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};

export const editImageWithGemini = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  const pureBase64 = base64ImageData.split(',')[1];
  if (!pureBase64) {
      throw new Error("Invalid base64 image data provided.");
  }
  const imagePart = { inlineData: { data: pureBase64, mimeType } };
  const textPart = { text: prompt };
  return generateImageFromParts([imagePart, textPart]);
};

export const createImageWithGemini = async (prompt: string, inspirationImages: { base64: string; mimeType: string }[]): Promise<string> => {
    const textPart = { text: prompt };
    const imageParts = inspirationImages.map(img => ({
        inlineData: {
            data: img.base64.split(',')[1],
            mimeType: img.mimeType,
        }
    }));
    const parts = [textPart, ...imageParts];
    return generateImageFromParts(parts);
};

export const getInitialBrandKit = async (logoBase64: string) => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    
    try {
        const [colorsResponse, typographyResponse] = await Promise.all([
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [ imagePart, { text: "Analyze this logo image and extract the 5 primary colors. Return a JSON array of objects, each with a 'hex' property. Example: [{'hex': '#RRGGBB'}]" }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING } } } },
                },
            }),
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [ imagePart, { text: "Based on this logo's style, suggest a heading and a body font from Google Fonts. Return a JSON object with 'headingFont' and 'bodyFont' keys. Example: {'headingFont': 'Montserrat', 'bodyFont': 'Lato'}" }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { headingFont: { type: Type.STRING }, bodyFont: { type: Type.STRING } } },
                },
            })
        ]);

        return {
            colors: JSON.parse(colorsResponse.text),
            typography: JSON.parse(typographyResponse.text),
        };
    } catch (error) {
        console.error("Error generating initial brand kit:", error);
        throw new Error("Failed to generate color palette and typography.");
    }
};

export const generateMockup = async (logoBase64: string, mockupType: string): Promise<string> => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    const textPart = { text: `Create a photorealistic mockup of a ${mockupType} featuring this logo. The background should be clean and professional, suitable for a brand presentation.` };
    return generateImageFromParts([imagePart, textPart]);
}

export const generateLogoVariation = async (logoBase64: string, variationType: 'white' | 'profile_picture' | 'transparent_bg'): Promise<string> => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    let prompt = '';
    if (variationType === 'white') {
        prompt = "Your task is to create a logo variation. Recreate the provided logo in solid white. The output must be a PNG file where the background is completely transparent (full alpha channel). Do not add a checkerboard pattern, colors, or any other elements to the background. Only the white logo shape should be visible.";
    } else if (variationType === 'transparent_bg') {
        prompt = "Your single, critical task is to perfectly remove the background from this logo image. The output MUST be a PNG file with a true, empty alpha channel for transparency. Do NOT under any circumstances render a checkerboard, a solid color, or any other pattern in the background. Isolate the main logo subject and make everything else fully transparent.";
    } else { // profile_picture
        prompt = "Adapt this logo to be a perfect social media profile picture. It should be easily recognizable when small and fit well inside a circular frame. Place it on a solid, neutral background that complements the logo.";
    }
    const textPart = { text: prompt };
    return generateImageFromParts([imagePart, textPart]);
}

export const generateSocialPost = async (logoBase64: string, brandName: string, vision: string) => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };

    const [imageResponse, captionResponse] = await Promise.all([
         generateImageFromParts([
            imagePart,
            { text: `Create an eye-catching social media announcement post graphic for a new brand called '${brandName}'. This is their logo. The post should be visually appealing and suitable for platforms like Instagram. The brand's vision is: '${vision}'.` }
        ]),
         ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Write a short, exciting social media caption to announce the launch of a new brand called '${brandName}'. Their vision is: '${vision}'. Keep it under 280 characters.`
        })
    ]);

    return {
        image: imageResponse,
        caption: captionResponse.text,
    };
};

export const generateBrandGuidelines = async (logoBase64: string) => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                imagePart,
                { text: "Based on this logo, generate a list of 2 simple 'dos' and 2 simple 'don'ts' for its usage. Return a JSON object with two keys: 'dos' and 'donts', each containing an array of strings. Example: {'dos': ['Do...'], 'donts': ['Don\\'t...']}" }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    dos: { type: Type.ARRAY, items: { type: Type.STRING } },
                    donts: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
            },
        },
    });
    return JSON.parse(response.text);
};