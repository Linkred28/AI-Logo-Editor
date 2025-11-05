import { GoogleGenAI, Modality, Type, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const handleGeminiError = (error: unknown, context: string): never => {
    console.error(`Error during ${context}:`, error);
    if (error instanceof Error) {
        // Check for rate limit / quota exceeded errors
        if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('rate limit')) {
            let detailedMessage = "Please check your plan and billing details, or try again later.";
            try {
                // The error message from the SDK can be a string that includes a JSON object.
                const jsonStartIndex = error.message.indexOf('{');
                if (jsonStartIndex > -1) {
                    const jsonString = error.message.substring(jsonStartIndex);
                    const errorJson = JSON.parse(jsonString);
                    if (errorJson?.error?.message) {
                        detailedMessage = errorJson.error.message;
                    }
                }
            } catch (e) {
                // Parsing failed, use a default message but log the issue.
                console.warn("Could not parse detailed error from API rate limit message.");
            }
            throw new Error(`API Rate Limit Exceeded: ${detailedMessage}`);
        }
        
        // For other types of errors, just pass a contextualized message.
        throw new Error(`Failed to generate ${context.replace(/_/g, ' ')}. ${error.message}`);
    }
    // Fallback for non-Error objects
    throw new Error(`An unknown error occurred during ${context.replace(/_/g, ' ')}.`);
};


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
    handleGeminiError(error, "image generation");
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
        handleGeminiError(error, "initial brand kit");
    }
};

type MockupPersonalizationData = {
    name: string;
    title: string;
    phone: string;
    email: string;
    website: string;
};

export const generateMockup = async (logoBase64: string, mockupType: string, personalization: MockupPersonalizationData): Promise<string> => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };

    const mockupPrompts: Record<string, string> = {
        'Business Card': 'Create a photorealistic mockup of a modern, professional business card featuring this logo.',
        'Coffee Cup': 'Generate a realistic mockup of a white ceramic coffee cup with this logo elegantly printed on its side. The scene should have soft lighting and a cafe-like ambiance.',
        'T-Shirt': 'Create a mockup of this logo on a high-quality, plain-colored t-shirt (e.g., heather grey, black, or white). The photo should be of the t-shirt folded neatly or worn by a mannequin.',
        'Storefront Sign': 'Generate a photorealistic mockup of a modern storefront with this logo displayed as a 3D sign. The sign could be blade-style or backlit, on a brick or glass facade.',
        'Social Media Profile': 'Create a mockup of a generic social media profile page viewed on a smartphone screen, prominently featuring the logo as the circular profile picture.',
        'Website on Laptop': 'Generate a photorealistic mockup of a modern, minimalist website homepage displayed on a laptop screen (like a MacBook) in a clean workspace. The website design should be specifically created to showcase this logo. Make the logo the large, central, and most prominent element on the page, as if it\'s featured in a hero section. The rest of the design (like navigation or background elements) should be simple and secondary, ensuring the logo is the main focus and is highly visible.',
        'Tote Bag': 'Create a mockup of this logo printed on a canvas tote bag. The bag can be held by a person or hanging against a neutral, textured wall.',
        'Letterhead': 'Generate a mockup of an A4 or US Letter-sized letterhead with this logo placed elegantly in the top-left corner. The paper should have a subtle texture and be placed on a professional desk.',
    };
    
    const personalizableMockups = new Set(['Business Card', 'Letterhead']);
    
    let prompt = mockupPrompts[mockupType] || `Create a photorealistic mockup of a ${mockupType} featuring this logo. The background should be clean and professional, suitable for a brand presentation.`;

    if (personalizableMockups.has(mockupType)) {
        let details = '';
        if (mockupType === 'Business Card') {
            details = ` The card should be placed on a clean, complementary surface like a wooden desk or marble countertop.
**This is a text rendering task. The absolute highest priority is text accuracy.**
You MUST render the following information onto the card.
**CRITICAL:** The text below must be copied EXACTLY, character-for-character. Double-check your output to ensure there are no spelling errors or typos. Any deviation from the source text is a failure.

--- BEGIN TEXT TO RENDER ---
${personalization.name}
${personalization.title}
Phone: ${personalization.phone}
Email: ${personalization.email}
Website: ${personalization.website}
--- END TEXT TO RENDER ---

Render this text clearly and legibly in a professional layout on the card. Do not add any other contact information.`;
        } else if (mockupType === 'Letterhead') {
            details = ` The letterhead must include contact information, usually in the header or footer.
**This is a text rendering task. The absolute highest priority is text accuracy.**
You MUST render the following information onto the letterhead.
**CRITICAL:** The text below must be copied EXACTLY, character-for-character. Double-check your output to ensure there are no spelling errors or typos. Any deviation from the source text is a failure.

--- BEGIN TEXT TO RENDER ---
Phone: ${personalization.phone} | Email: ${personalization.email} | Website: ${personalization.website}
--- END TEXT TO RENDER ---

Render this text clearly and professionally. Do not add any other contact information.`;
        }
        prompt += details;
    }

    const textPart = { text: prompt };
    
    return generateImageFromParts([imagePart, textPart]);
}


export const generateLogoVariation = async (logoBase64: string, variationType: 'white' | 'profile_picture' | 'transparent_bg'): Promise<string> => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    let prompt = '';
    if (variationType === 'white') {
        prompt = "Generate a new version of the provided logo that is solid white with a completely transparent background. The final image must be a PNG with a full alpha channel, containing only the white logo shape, with no background color or pattern.";
    } else if (variationType === 'transparent_bg') {
        prompt = "Generate a new version of the provided logo with its background completely removed. Your task is to perfectly isolate the main subject (the central icon and text) and make everything else transparent. This includes removing gradients, background shapes, or decorative elements. The final output must be a PNG with a true transparent alpha channel, containing only the logo's core elements.";
    } else { // profile_picture
        prompt = "Generate a social media profile picture from this logo. The new image should be adapted to be easily recognizable when small and fit well inside a circular frame. Place the logo on a solid, neutral background that complements its colors.";
    }
    const textPart = { text: prompt };
    return generateImageFromParts([imagePart, textPart]);
}

export const generateSocialPost = async (logoBase64: string, brandName: string, vision: string) => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    
    try {
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
    } catch (error) {
        handleGeminiError(error, "social post");
    }
};

export const generateBrandGuidelines = async (logoBase64: string) => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    const prompt = `
    As a senior brand strategist with 15 years of experience, analyze the provided logo and generate a concise yet comprehensive brand guideline document. Your analysis must be deep, congruent, and clear, providing real value for a brand manual.
    
    Return a JSON object with the following structure and content:
    
    - "logoPhilosophy": A short paragraph (2-3 sentences) describing the core concept, feeling, and values the logo visually represents.
    - "clearSpaceRule": A simple, actionable rule for the minimum empty space around the logo. Express it relative to a feature of the logo itself (e.g., "equal to the height of the main letterform 'X'").
    - "minimumSize": A specific minimum size for digital use to ensure legibility (e.g., "32px width").
    - "colorUsage": An array of 2-3 strings detailing best practices for using the brand colors with the logo.
    - "logoMisuse": An array of 2-3 strings listing common incorrect applications to avoid (e.g., "Do not stretch or distort the logo," "Do not place on visually cluttered backgrounds").
    - "toneOfVoice": An array of 3-4 keywords that describe the brand's communication style as suggested by the logo's design.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        logoPhilosophy: { type: Type.STRING },
                        clearSpaceRule: { type: Type.STRING },
                        minimumSize: { type: Type.STRING },
                        colorUsage: { type: Type.ARRAY, items: { type: Type.STRING } },
                        logoMisuse: { type: Type.ARRAY, items: { type: Type.STRING } },
                        toneOfVoice: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['logoPhilosophy', 'clearSpaceRule', 'minimumSize', 'colorUsage', 'logoMisuse', 'toneOfVoice']
                },
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        handleGeminiError(error, "brand guidelines");
    }
};

// --- BRANDING TEXT GENERATION ---
const generateText = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text.trim().replace(/["']/g, ''); // Clean up quotes
    } catch (error) {
        handleGeminiError(error, "text suggestion");
    }
};

export const generateBrandName = (industry: string, vision: string) => {
    const prompt = `You are a branding expert. Generate a single, creative, and memorable brand name for a company in the '${industry}' industry. Their vision is: '${vision}'. Return only the name, with no extra text or quotes.`;
    return generateText(prompt);
};

export const generateSloganSuggestions = async (brandName: string, industry: string, vision: string): Promise<string[]> => {
    const prompt = `You are a branding expert. Generate 5 creative and catchy slogans for a brand named '${brandName}' in the '${industry}' industry. Their vision is: '${vision}'.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        slogans: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['slogans']
                },
            },
        });
        const result = JSON.parse(response.text);
        return result.slogans || [];
    } catch (error) {
        handleGeminiError(error, "slogan suggestions");
    }
};

export const generateNameFromLogo = async (logoBase64: string) => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    const textPart = { text: "Analyze this logo. Suggest a creative and fitting brand name for it. Return only the name, with no extra text or quotes." };
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] }
        });
        return response.text.trim().replace(/["']/g, '');
    } catch (error) {
        handleGeminiError(error, "name from logo");
    }
};


export const generateSloganSuggestionsFromLogo = async (logoBase64: string, brandName: string): Promise<string[]> => {
    const pureBase64 = logoBase64.split(',')[1];
    const imagePart = { inlineData: { data: pureBase64, mimeType: 'image/png' } };
    const textPart = { text: `Analyze this logo for a brand named '${brandName}'. Suggest 5 short, catchy slogans that match its style.` };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        slogans: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                     required: ['slogans']
                },
            },
        });
        const result = JSON.parse(response.text);
        return result.slogans || [];
    } catch (error) {
        handleGeminiError(error, "slogans from logo");
    }
};