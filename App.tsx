import React, { useState, useCallback, ChangeEvent } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { editImageWithGemini } from './services/geminiService';

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400"></div>
    <p className="text-teal-300">Generating your new logo...</p>
  </div>
);

const App: React.FC = () => {
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('Cambia el texto "METODIKO" a "M", conservando el mismo estilo, fuente y color.');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImageFile(file);
      setGeneratedImage(null);
      setError(null);
      try {
        const base64Preview = await fileToBase64(file);
        setOriginalImagePreview(base64Preview);
      } catch (err) {
        setError('Failed to read the image file.');
        setOriginalImagePreview(null);
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!originalImageFile || !originalImagePreview || !prompt) {
      setError("Please upload an image and provide a prompt.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const qualityEnhancementPrompt = 'El resultado debe ser un logotipo de alta resolución y calidad profesional con líneas limpias y nítidas, sin pixelación ni artefactos. La imagen final debe parecer un gráfico nítido de estilo vectorial.';
      const fullPrompt = `${prompt}. ${qualityEnhancementPrompt}`;

      const newImageBase64 = await editImageWithGemini(
        originalImagePreview,
        originalImageFile.type,
        fullPrompt
      );
      setGeneratedImage(newImageBase64);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [originalImageFile, originalImagePreview, prompt]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'generated-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">
          AI Logo Editor
        </h1>
        <p className="mt-2 text-lg text-gray-400">Transform your logo with a simple text instruction.</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col space-y-6">
          <div>
            <label className="text-lg font-semibold text-gray-300 mb-2 block">1. Upload Original Logo</label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-600 px-6 py-10 hover:border-teal-400 transition-colors">
              {!originalImagePreview ? (
                <div className="text-center">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-400">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-teal-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-teal-300"
                    >
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              ) : (
                 <div className="relative group">
                    <img src={originalImagePreview} alt="Original logo preview" className="max-h-60 rounded-md" />
                     <label htmlFor="file-upload" className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        Change Image
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="prompt" className="text-lg font-semibold text-gray-300 mb-2 block">2. Describe Your Edit</label>
            <textarea
              id="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="block w-full rounded-md border-0 bg-gray-700/80 py-2 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-500 sm:text-sm sm:leading-6 transition"
              placeholder="e.g., Change the text to 'NewName'"
            />
          </div>

          <div className="pt-4">
             <button
              onClick={handleSubmit}
              disabled={isLoading || !originalImageFile}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isLoading ? 'Generating...' : 'Generate New Logo'}
              <SparklesIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex items-center justify-center min-h-[300px]">
           <div className="w-full h-full flex items-center justify-center">
                {isLoading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <div className="text-center text-red-400">
                        <p className="font-semibold">Generation Failed</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                ) : generatedImage ? (
                    <div className="text-center space-y-4">
                        <img src={generatedImage} alt="Generated logo" className="max-h-[24rem] rounded-md object-contain" />
                        <button
                          onClick={handleDownload}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 transition-all duration-300"
                        >
                          <DownloadIcon className="h-5 w-5" />
                          Download as PNG
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                      <div className="text-gray-500">
                        <h3 className="text-lg font-medium">Your new logo will appear here</h3>
                        <p className="mt-1 text-sm">Upload a logo and describe your edit to get started.</p>
                      </div>
                      <button
                        disabled
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-not-allowed"
                      >
                        <DownloadIcon className="h-5 w-5" />
                        Download as PNG
                      </button>
                    </div>
                )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
