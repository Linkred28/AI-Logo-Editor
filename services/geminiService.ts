import { GoogleGenAI, Modality, Type, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("La variable de entorno API_KEY no está definida. Las llamadas a la API fallarán.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || 'dummy-key' });

/**
 * Helper: Convierte un objeto JSON a una cadena formateada para el prompt.
 */
const jsonToPrompt = (json: any): string => {
  return JSON.stringify(json, null, 2);
};

/**
 * Genera un nombre de marca basado en una descripción de texto.
 */
export const generateBrandName = async (description: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: `Genera un nombre de marca único, pegadizo y profesional para un negocio descrito como: "${description}". Devuelve SOLO el nombre, sin comillas ni explicaciones. El nombre debe ser en Español si aplica.`,
      config: { temperature: 0.8 }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error al generar nombre:", error);
    throw new Error("No se pudo generar el nombre de la marca.");
  }
};

/**
 * Genera un nombre de marca basado en una imagen de logo existente.
 */
export const generateNameFromLogo = async (imageBase64: string): Promise<string> => {
   try {
    const model = 'gemini-2.5-flash'; // Usamos Flash para razonamiento multimodal rápido
    const imagePart = {
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64.split(',')[1],
      },
    };

    const response = await ai.models.generateContent({
      model,
      contents: {
          parts: [
              imagePart,
              { text: "Mira este logo. ¿Cuál es el nombre de la marca que aparece en él? Si no hay texto, inventa un nombre adecuado basado en el símbolo. Devuelve SOLO el nombre." }
          ]
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error al extraer nombre del logo:", error);
    return "Tu Marca";
  }
}


/**
 * Genera sugerencias de eslóganes (Slogans).
 */
export const generateSloganSuggestions = async (brandName: string, description: string): Promise<string[]> => {
  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: `Para la marca "${brandName}" (descripción: "${description}"), genera 3 eslóganes pegadizos en español de México. Devuelve la respuesta como un array JSON de strings. Ejemplo: ["Eslógan 1", "Eslógan 2", "Eslógan 3"]. Sin markdown code blocks.`,
      config: { 
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
          }
      }
    });
    const json = JSON.parse(response.text);
    return json;
  } catch (error) {
    console.error("Error al generar eslóganes:", error);
    return [`La mejor opción para ${brandName}`, `Calidad y servicio en ${brandName}`, `${brandName}: Tu solución ideal`];
  }
};

export const generateSloganSuggestionsFromLogo = async (brandName: string, imageBase64: string): Promise<string[]> => {
    try {
        const model = 'gemini-2.5-flash';
        const imagePart = {
            inlineData: {
                mimeType: 'image/png',
                data: imageBase64.split(',')[1],
            },
        };
        
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    imagePart,
                    { text: `Basándote en el estilo visual de este logo y el nombre de marca "${brandName}", genera 3 eslóganes creativos en español de México que combinen con la vibra de la imagen. Devuelve un array JSON de strings.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error slogans from logo:", error);
        return [`${brandName}: Estilo único`, `Innovación en ${brandName}`, `Descubre ${brandName}`];
    }
}

/**
 * Crea un logo desde cero usando Imagen 3.
 */
export const createImageWithGemini = async (prompt: string, style: string): Promise<string> => {
  try {
    const model = 'imagen-3.0-generate-002'; // Fallback a modelo disponible si imagen-3 falla, pero intentamos imagen-3
    // Nota: Para imagen-3 en vertex sería diferente, aquí usamos el sdk estándar asumiendo imagen-3.0-generate-001 o similar si está disponible,
    // si no, usaremos gemini-2.5-flash-image para generación general si imagen específica falla, 
    // pero la instrucción pide usar modelos válidos.
    // Usaremos 'imagen-3.0-generate-001' como especificado en docs para High Quality o similar.
    // Revisando guidelines: 'imagen-4.0-generate-001' es para high quality image. 'gemini-2.5-flash-image' general.
    // Usaremos gemini-2.5-flash-image por velocidad y versatilidad en demo, o imagen-4 si se requiere ultra calidad.
    // El usuario pidió "integro de colores, fuente...".
    
    // Construimos un prompt rico
    const fullPrompt = `Un diseño de logotipo profesional para una marca. Estilo: ${style}. Descripción: ${prompt}. Fondo blanco limpio, minimalista, alta resolución, diseño vectorial.`;

    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001', 
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '1:1',
            outputMimeType: 'image/jpeg'
        }
    });

    // Imagen response structure
    const base64Image = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64Image}`;

  } catch (error) {
    console.error("Error al crear imagen:", error);
    throw new Error("No se pudo generar el logo. Intenta con otra descripción.");
  }
};

/**
 * Edita o genera variaciones de un logo existente.
 * (Gemini 2.5 Flash Image no soporta edición directa tipo inpainting con máscara en este SDK simple,
 *  pero podemos pedirle una variación visual o usarlo como referencia).
 */
export const editImageWithGemini = async (imageBase64: string, instructions: string): Promise<string> => {
  // Como 'edit' real requiere capacidades específicas, usaremos generación multimodal:
  // "Genera una imagen nueva basada en esta referencia y estas instrucciones".
  try {
    const model = 'gemini-2.5-flash-image'; // Modelo capaz de ver imagen y generar imagen (si está habilitado) o devolver texto.
    // Wait, gemini-2.5-flash-image generates images? Guidelines say:
    // "General Image Generation and Editing Tasks: 'gemini-2.5-flash-image'"
    // YES.
    
    const imagePart = {
        inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: 'image/png' // Asumimos png/jpeg
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                imagePart,
                { text: `Sigue estas instrucciones para modificar/recrear este logo: ${instructions}. Mantén la esencia pero aplica los cambios. Alta calidad, fondo blanco.` }
            ]
        },
        config: {
            responseModalities: [Modality.IMAGE]
        }
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No se generó imagen de respuesta.");
  } catch (error) {
    console.error("Error al editar imagen:", error);
    throw new Error("No se pudo editar el logo.");
  }
};

/**
 * Genera un Kit de Marca inicial (Colores, Tipografía) analizando el logo o la descripción.
 */
export const getInitialBrandKit = async (description: string, imageBase64?: string): Promise<{ colors: { hex: string }[], typography: { headingFont: string, bodyFont: string } }> => {
    try {
        const model = 'gemini-2.5-flash';
        let parts: Part[] = [];
        
        if (imageBase64) {
            parts.push({
                inlineData: {
                    data: imageBase64.split(',')[1],
                    mimeType: 'image/png'
                }
            });
            parts.push({ text: "Analiza este logo y extrae su paleta de colores principal y sugiere tipografías que combinen." });
        } else {
            parts.push({ text: `Para una marca descrita como: "${description}", sugiere una paleta de colores y tipografía.` });
        }

        parts.push({ text: `Devuelve un objeto JSON con: 
        1. "colors": array de 5 objetos { "hex": "#RRGGBB", "name": "Nombre en Español" }.
        2. "typography": objeto con "headingFont" (nombre fuente popular) y "bodyFont" (nombre fuente popular).
        Responde SOLO con JSON.` });

        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text);
        // Normalizar salida
        return {
            colors: result.colors.map((c: any) => ({ hex: c.hex, name: c.name })),
            typography: result.typography
        };
    } catch (error) {
        console.error("Error obteniendo brand kit:", error);
        // Fallback
        return {
            colors: [{ hex: '#1C1C1E' }, { hex: '#F59E0B' }, { hex: '#FFFFFF' }, { hex: '#E0E0E0' }, { hex: '#4A4A4C' }],
            typography: { headingFont: 'Inter', bodyFont: 'Roboto' }
        };
    }
};

/**
 * Genera un Mockup visual.
 * Nota: Imagen 3/Gemini no pone logos sobre objetos 3D perfectamente (wrap) sin herramientas especializadas,
 * pero podemos pedirle que genere una imagen "estilo mockup" del producto con el logo aplicado.
 */
export const generateMockup = async (logoBase64: string, type: 't-shirt' | 'business-card' | 'signage'): Promise<string> => {
    try {
         const model = 'gemini-2.5-flash-image';
         const prompts = {
             't-shirt': "Una fotografía realista de una playera (camiseta) de alta calidad doblada sobre una mesa de madera, con este logotipo impreso en el pecho. Iluminación cinemática.",
             'business-card': "Una fotografía macro profesional de tarjetas de presentación (visita) apiladas en un escritorio elegante, mostrando este logotipo claramente en el centro. Profundidad de campo.",
             'signage': "Una foto de un letrero moderno en la fachada de un edificio o tienda, mostrando este logotipo. Estilo urbano, luz natural."
         };

         const response = await ai.models.generateContent({
             model,
             contents: {
                 parts: [
                     { inlineData: { data: logoBase64.split(',')[1], mimeType: 'image/png' } },
                     { text: prompts[type] }
                 ]
             },
             config: { responseModalities: [Modality.IMAGE] }
         });

        const candidates = response.candidates;
        if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No se generó imagen.");
    } catch (error) {
        console.error("Error generando mockup:", error);
        throw error;
    }
};

/**
 * Genera una variación del logo.
 */
export const generateLogoVariation = async (logoBase64: string, style: string): Promise<string> => {
     return editImageWithGemini(logoBase64, `Crea una variación de este logo con estilo: ${style}. Mantén la identidad de marca pero explora una estética diferente.`);
};

/**
 * Genera contenido para redes sociales (Caption + Idea de imagen).
 * Como tenemos capacidad de generar imagen, generaremos la imagen del post también.
 */
export const generateSocialPost = async (brandName: string, logoBase64: string, topic: string): Promise<{ image: string, caption: string }> => {
    try {
        // 1. Generar el caption
        const textModel = 'gemini-2.5-flash';
        const textResp = await ai.models.generateContent({
            model: textModel,
            contents: `Escribe un post de Instagram atractivo y profesional para la marca "${brandName}". Tema: "${topic}".
            Incluye emojis relevantes. El tono debe ser inspirador y mexicano (usa palabras como 'padre', 'chido', pero profesional si aplica, o neutro cálido).
            Usa hashtags.
            Longitud máxima: 280 caracteres.`
        });
        const caption = textResp.text;

        // 2. Generar la imagen del post
        const imageModel = 'gemini-2.5-flash-image';
        const imgResp = await ai.models.generateContent({
            model: imageModel,
            contents: {
                parts: [
                    { inlineData: { data: logoBase64.split(',')[1], mimeType: 'image/png' } },
                    { text: `Crea una imagen cuadrada para redes sociales (Instagram) para la marca "${brandName}". Tema: "${topic}". La imagen debe ser estéticamente agradable, estilo lifestyle o fotografía de producto, e incorporar sutilmente el logo o sus colores.` }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        let image = "";
        if (imgResp.candidates?.[0]?.content?.parts) {
            for (const part of imgResp.candidates[0].content.parts) {
                if (part.inlineData) {
                    image = `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }

        return { caption, image };

    } catch (error) {
        console.error("Error generando social post:", error);
        throw error;
    }
};

/**
 * Genera guías de marca textuales.
 */
export const generateBrandGuidelines = async (brandName: string, logoBase64: string): Promise<any> => {
    try {
        const model = 'gemini-2.5-flash';
        // Se asume que pasamos el logo para análisis visual
        const parts: Part[] = [
            { inlineData: { data: logoBase64.split(',')[1], mimeType: 'image/png' } },
            { text: `Actúa como un Director Creativo experto. Para la marca "${brandName}" (cuyo logo adjunto), genera un breve manual de identidad en formato JSON en Español de México.
            
            Campos requeridos:
            - logoPhilosophy: Explicación breve (40 palabras) del significado del logo.
            - clearSpaceRule: Regla de espacio libre (1 frase).
            - minimumSize: Tamaño mínimo recomendado (ej. 20px).
            - colorUsage: Array de 2 strings con reglas de uso de color (ej. "Usar fondo oscuro para...").
            - logoMisuse: Array de 3 cosas que NO hacer con el logo.
            - toneOfVoice: Array de 3 adjetivos que describan la voz de la marca.
            
            Responde SOLO JSON.` }
        ];

        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generando guías:", error);
        throw error;
    }
};
