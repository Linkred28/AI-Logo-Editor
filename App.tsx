import React, { useState, useCallback, ChangeEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { 
    editImageWithGemini, 
    createImageWithGemini, 
    getInitialBrandKit,
    generateMockup,
    generateLogoVariation,
    generateSocialPost,
    generateBrandGuidelines
} from './services/geminiService';

type Mode = 'create' | 'edit';
type BrandKit = {
  colors: { hex: string }[];
  typography: { headingFont: string; bodyFont: string };
};
type Status = 'idle' | 'loading' | 'error' | 'success';
// Fix: Add a specific type for the mockup state to help with type inference downstream.
type MockupState = {
  status: Status;
  url?: string;
};


// --- ICONS ---
const UploadIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg> );
const SparklesIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg> );
const DownloadIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> );
const RefreshIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0 8.25 8.25 0 0 0 0-11.667l-3.182-3.182m0 0-3.182 3.182m7.156 0-3.182-3.182" /></svg> );
const WandIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.12-2.122L6.12 13.65a3 3 0 0 0-2.122 2.122L3.65 16.12a3 3 0 0 0 2.122 2.122L6.12 18.57a3 3 0 0 0 2.12-2.122L9.53 16.122ZM18.88 9.53a3 3 0 0 0-2.122-2.122L16.12 6.12a3 3 0 0 0-2.122 2.122L13.65 9.53a3 3 0 0 0 2.122 2.122L16.12 12.12a3 3 0 0 0 2.12-2.122L18.88 9.53Z" /><path strokeLinecap="round" strokeLinejoin="round" d="m12.12 6.12 2.247-2.247a3 3 0 0 0-4.242-4.242L6.12 3.65a3 3 0 0 0-2.122 2.122L3.65 6.12a3 3 0 0 0 2.122 2.122L6.12 8.487m6-2.367.003.002.002.002.002.002.003.002.002.002.002.003.002.002.002.003.002.002.003.002.002.002.003.002.002.003.002.002.002.003.002.002Z" /></svg> );
const SendIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg> );
const CheckIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> );
const XIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> );


// --- LOADING SPINNERS ---
const LoadingSpinner: React.FC<{text: string}> = ({ text }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400"></div>
    <p className="text-teal-300">{text}</p>
  </div>
);

// --- DATA ---
const DESIGNER_PERSONAS = [
    { name: 'Swiss Master', value: 'a minimalist, geometric, clean style using sans-serif typography, embodying Swiss design principles.' },
    { name: 'Vintage Artisan', value: 'a style with textures, stamps, and seals, using serif and script typography for a vintage, handcrafted feel.' },
    { name: 'Tech Innovator', value: 'a futuristic, abstract style with gradients and modern aesthetics.' },
    { name: 'Playful Illustrator', value: 'a fun, friendly, hand-drawn style, possibly featuring a character or mascot.' },
];
const MOCKUP_TYPES = ['Business Card', 'Coffee Cup', 'T-Shirt', 'Storefront Sign', 'Social Media Profile'];

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<Mode>('create');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Universal State
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  
  // Create Mode State
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [vision, setVision] = useState('');
  const [designerPersona, setDesignerPersona] = useState('');
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [inspirationPreviews, setInspirationPreviews] = useState<string[]>([]);
  
  // Edit Mode State
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [editHistory, setEditHistory] = useState<{user: string, image: string}[]>([]);
  
  // Brand Kit State
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  // Fix: Use the MockupState type for the generatedMockups state.
  const [generatedMockups, setGeneratedMockups] = useState<Record<string, MockupState>>({});
  const [socialPost, setSocialPost] = useState<{status: Status, image?: string, caption?: string} | null>(null);
  const [brandGuidelines, setBrandGuidelines] = useState<{status: Status, dos?: string[], donts?: string[]} | null>(null);
  const [logoVariations, setLogoVariations] = useState<Record<string, {status: Status, url?: string}>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [editHistory]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setGeneratedImage(null);
    setPrompt('');
    setBrandName('');
    setIndustry('');
    setVision('');
    setDesignerPersona('');
    setInspirationFiles([]);
    setInspirationPreviews([]);
    setOriginalImageFile(null);
    setEditHistory([]);
    setBrandKit(null);
    setGeneratedMockups({});
    setSocialPost(null);
    setBrandGuidelines(null);
    setLogoVariations({});
  }, []);
  
  const handleModeChange = useCallback((mode: Mode) => {
    if (mode !== activeMode) {
      setActiveMode(mode);
      handleReset();
    }
  }, [activeMode, handleReset]);

  // Fix: Replaced Array.from with a manual loop to ensure correct type inference from FileList.
  const handleInspirationUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
        const fileList: File[] = [];
        for (let i = 0; i < Math.min(files.length, 3); i++) {
            const file = files.item(i);
            if (file) {
                fileList.push(file);
            }
        }
        setInspirationFiles(fileList);
        const previews = await Promise.all(fileList.map(file => fileToBase64(file)));
        setInspirationPreviews(previews);
    }
  }, []);

  const handleImageUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleReset();
      setActiveMode('edit');
      setOriginalImageFile(file);
      try {
        const base64Preview = await fileToBase64(file);
        setGeneratedImage(base64Preview);
      } catch (err) {
        setError('Failed to read the image file.');
        setStatus('error');
      }
    }
  }, [handleReset]);

  const handleGuidedSubmit = useCallback(async () => {
    let fullPrompt = `A professional, high-quality logo for a brand named '${brandName}' in the ${industry} industry.`;
    if (vision) fullPrompt += ` The brand's vision is: "${vision}".`;
    if (designerPersona) fullPrompt += ` The desired style is ${designerPersona}`;
    if (inspirationPreviews.length > 0) fullPrompt += ` Draw inspiration from the provided images for mood, color, and style.`;
    
    setStatus('loading');
    setError(null);
    setGeneratedImage(null);
    setBrandKit(null);
    
    try {
      const imageAssets = await Promise.all(inspirationFiles.map(async (file) => ({
        base64: await fileToBase64(file),
        mimeType: file.type
      })));

      const newImageBase64 = await createImageWithGemini(fullPrompt, imageAssets);
      setGeneratedImage(newImageBase64);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setStatus('error');
    }
  }, [brandName, industry, vision, designerPersona, inspirationFiles]);

  const handleEditSubmit = useCallback(async () => {
    if (!prompt || !generatedImage || !originalImageFile) return;
    const currentPrompt = prompt;
    setPrompt('');
    setStatus('loading');
    setError(null);
    try {
        const editInstruction = `You are an expert logo designer. Your task is to edit the provided logo image based on this user request: "${currentPrompt}". It is crucial that you generate a new image with the requested modifications, not return the original. The final output must be a professional, clean, high-quality logo.`;
        const newImageBase64 = await editImageWithGemini( generatedImage, originalImageFile.type, editInstruction );
        setGeneratedImage(newImageBase64);
        setEditHistory(prev => [...prev, { user: currentPrompt, image: newImageBase64 }]);
        setStatus('success');
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        setStatus('error');
    }
}, [prompt, generatedImage, originalImageFile]);

  const handleGenerateInitialBrandKit = useCallback(async () => {
    if (!generatedImage) return;
    setStatus('loading');
    setError(null);
    try {
        const kit = await getInitialBrandKit(generatedImage);
        setBrandKit(kit);
        setStatus('success');
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during brand kit generation.");
        setStatus('error');
    }
  }, [generatedImage]);

  const handleGenerateMockup = async (mockupType: string) => {
    if (!generatedImage) return;
    setGeneratedMockups(prev => ({ ...prev, [mockupType]: { status: 'loading' } }));
    try {
        const url = await generateMockup(generatedImage, mockupType);
        setGeneratedMockups(prev => ({ ...prev, [mockupType]: { status: 'success', url } }));
    } catch (e) {
        setGeneratedMockups(prev => ({ ...prev, [mockupType]: { status: 'error' } }));
    }
  };

  const handleGenerateLogoVariation = async (variation: 'white' | 'profile_picture') => {
    if (!generatedImage) return;
    setLogoVariations(prev => ({ ...prev, [variation]: { status: 'loading' } }));
    try {
        const url = await generateLogoVariation(generatedImage, variation);
        setLogoVariations(prev => ({ ...prev, [variation]: { status: 'success', url } }));
    } catch (e) {
        setLogoVariations(prev => ({ ...prev, [variation]: { status: 'error' } }));
    }
  }

  const handleGenerateSocialPost = async () => {
    if (!generatedImage) return;
    setSocialPost({ status: 'loading' });
    try {
        const post = await generateSocialPost(generatedImage, brandName, vision);
        setSocialPost({ status: 'success', ...post });
    } catch (e) {
        setSocialPost({ status: 'error' });
    }
  }
  
  const handleGenerateGuidelines = async () => {
    if (!generatedImage) return;
    setBrandGuidelines({ status: 'loading' });
    try {
        const guidelines = await generateBrandGuidelines(generatedImage);
        setBrandGuidelines({ status: 'success', ...guidelines });
    } catch (e) {
        setBrandGuidelines({ status: 'error' });
    }
  }

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const isCreateDisabled = status === 'loading' || !brandName || !industry || !designerPersona;
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">
          AI Brand Co-pilot
        </h1>
        <p className="mt-2 text-lg text-gray-400">Your partner in crafting a unique brand identity from vision to reality.</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- INPUT PANEL --- */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col space-y-6">
            <div className="flex justify-between items-center border-b border-gray-700">
                <div className="flex">
                    <button onClick={() => handleModeChange('create')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeMode === 'create' ? 'border-b-2 border-teal-400 text-white' : 'text-gray-400 hover:text-white'}`}>Create</button>
                    <button onClick={() => handleModeChange('edit')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeMode === 'edit' ? 'border-b-2 border-teal-400 text-white' : 'text-gray-400 hover:text-white'}`}>Edit</button>
                </div>
                 <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors" aria-label="Start Over">
                    <RefreshIcon className="h-4 w-4" />
                    Start Over
                </button>
            </div>

            {/* CREATE MODE: GUIDED ASSISTANT */}
            {activeMode === 'create' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-200">Intelligent Design Brief</h2>
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">1. Brand Name & Industry</label>
                        <div className="grid grid-cols-2 gap-2">
                           <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g., The Daily Grind" className="block w-full rounded-md border-0 bg-gray-700/80 py-2 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-teal-500"/>
                           <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., Coffee Shop" className="block w-full rounded-md border-0 bg-gray-700/80 py-2 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-teal-500"/>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">2. Describe your vision</label>
                        <textarea value={vision} onChange={(e) => setVision(e.target.value)} rows={3} placeholder="e.g., A mix of vintage engraving and modern tech..." className="block w-full rounded-md border-0 bg-gray-700/80 py-2 px-3 text-gray-200 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-teal-500"></textarea>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">3. Designer Persona</label>
                         <div className="grid grid-cols-2 gap-2">
                            {DESIGNER_PERSONAS.map(p => <button key={p.name} onClick={() => setDesignerPersona(p.value)} className={`text-left p-2 text-xs font-medium rounded-md transition-all border ${designerPersona === p.value ? 'bg-teal-500 text-white border-teal-400' : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600 border-gray-600'}`}>{p.name}</button>)}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">4. Visual Inspiration (optional, up to 3)</label>
                        <div className="flex items-center gap-4">
                            <label htmlFor="inspiration-upload" className="cursor-pointer rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-teal-400 hover:bg-gray-600">Upload Images</label>
                            <input id="inspiration-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleInspirationUpload} />
                            <div className="flex gap-2">
                                {inspirationPreviews.map((src, i) => <img key={i} src={src} className="h-10 w-10 rounded-md object-cover"/>)}
                            </div>
                        </div>
                    </div>
                    <div className="pt-2">
                        <button onClick={handleGuidedSubmit} disabled={isCreateDisabled} className="w-full flex items-center justify-center gap-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:scale-100">Create New Logo <SparklesIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            )}
            
            {/* EDIT MODE: CONVERSATIONAL CHAT */}
            {activeMode === 'edit' && (
                 <div className="flex flex-col h-full">
                    {!generatedImage ? (
                        <div>
                           <label className="text-lg font-semibold text-gray-300 mb-2 block">Upload a Logo to Edit</label>
                           <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-600 px-6 py-10 hover:border-teal-400 transition-colors">
                                <input id="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                                <div className="text-center">
                                    <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                                    <div className="mt-4 flex text-sm text-gray-400"><label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-teal-400 hover:text-teal-300"><span>Upload a file</span></label><p className="pl-1">or drag and drop</p></div>
                                    <p className="text-xs text-gray-500">PNG, JPG, etc.</p>
                                </div>
                           </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-grow min-h-0">
                            <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
                                <p className="text-center text-sm text-gray-400">This is your editing canvas. What would you like to change?</p>
                                {editHistory.map((entry, index) => (
                                    <React.Fragment key={index}>
                                        <div className="flex justify-end">
                                            <p className="bg-teal-800/50 text-white text-sm rounded-lg py-2 px-3 inline-block max-w-xs text-left">{entry.user}</p>
                                        </div>
                                        <div className="flex justify-start">
                                            <div className="relative group">
                                                <img src={entry.image} alt={`Edit step ${index + 1}`} className="max-h-32 rounded-lg object-contain bg-gray-700/50 p-1" />
                                                <button
                                                    onClick={() => downloadImage(entry.image, `logo_edit_${index + 1}.png`)}
                                                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label={`Download edit step ${index + 1}`}
                                                >
                                                    <DownloadIcon className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="relative">
                                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && status !== 'loading' && handleEditSubmit()} placeholder="e.g., Change the color to blue..." className="block w-full rounded-md border-0 bg-gray-700/80 py-3 pl-4 pr-12 text-gray-200 ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-teal-500" disabled={status === 'loading'} />
                                <button onClick={handleEditSubmit} disabled={status === 'loading' || !prompt} className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:opacity-50 text-teal-400 hover:text-teal-300"> <SendIcon className="h-6 w-6"/> </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* --- OUTPUT PANEL --- */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col items-center justify-center min-h-[500px] space-y-4">
            {status === 'loading' && <LoadingSpinner text="Generating..." />}
            {status === 'error' && error && (
                <div className="text-center text-red-400 space-y-4">
                    <div><p className="font-semibold">Generation Failed</p><p className="text-sm mt-1">{error}</p></div>
                    <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500"><RefreshIcon className="h-5 w-5" />Start Over</button>
                </div>
            )}
            {status !== 'loading' && !generatedImage && (
                <div className="text-center text-gray-500 space-y-2">
                    <SparklesIcon className="h-16 w-16 mx-auto text-gray-600"/>
                    <h3 className="text-lg font-medium">Your brand identity awaits</h3>
                    <p className="mt-1 text-sm">Use the intelligent brief to get started.</p>
                </div>
            )}
            {generatedImage && (
                <div className="w-full text-center space-y-4 overflow-y-auto">
                    <div className="relative group inline-block">
                        <img src={generatedImage} alt="Generated logo" className="max-h-60 mx-auto rounded-md object-contain" />
                        <button 
                            onClick={() => downloadImage(generatedImage, 'logo.png')} 
                            className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" 
                            aria-label="Download logo"
                        >
                            <DownloadIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    {!brandKit && (<button onClick={handleGenerateInitialBrandKit} className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition-all"><WandIcon className="h-5 w-5" />Build Brand Kit</button>)}
                    
                    {brandKit && (
                        <div className="text-left bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-6">
                            {/* Downloads */}
                            <div>
                                <h3 className="text-base font-semibold text-teal-300 mb-2">Download Assets</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                     <button onClick={() => downloadImage(generatedImage, 'logo_color.png')} className="text-xs bg-cyan-700 hover:bg-cyan-600 p-2 rounded-md flex items-center justify-center gap-1"><DownloadIcon className="h-4 w-4" />Color Logo</button>
                                     <button onClick={() => handleGenerateLogoVariation('white')} disabled={logoVariations.white?.status === 'loading'} className="text-xs bg-gray-600 hover:bg-gray-500 p-2 rounded-md disabled:bg-gray-700">{logoVariations.white?.status === 'loading' ? '...' : 'White Logo'}</button>
                                     <button onClick={() => handleGenerateLogoVariation('profile_picture')} disabled={logoVariations.profile_picture?.status === 'loading'} className="text-xs bg-gray-600 hover:bg-gray-500 p-2 rounded-md disabled:bg-gray-700">{logoVariations.profile_picture?.status === 'loading' ? '...' : 'Profile Picture'}</button>
                                </div>
                                 <div className="flex items-start gap-2 mt-2">
                                     {logoVariations.white?.url && (
                                        <div className="relative group">
                                            <img src={logoVariations.white.url} alt="White logo variation" className="h-16 w-16 object-contain rounded-md bg-gray-800 p-1"/>
                                            <button onClick={() => downloadImage(logoVariations.white.url!, 'logo_white.png')} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download white logo">
                                                <DownloadIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    )}
                                    {logoVariations.profile_picture?.url && (
                                        <div className="relative group">
                                            <img src={logoVariations.profile_picture.url} alt="Profile picture variation" className="h-16 w-16 object-contain rounded-full"/>
                                            <button onClick={() => downloadImage(logoVariations.profile_picture.url!, 'logo_profile_picture.png')} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download profile picture">
                                                <DownloadIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    )}
                                 </div>
                            </div>
                            {/* Palette & Typography */}
                            <div>
                                <h3 className="text-base font-semibold text-teal-300 mb-2">Core Identity</h3>
                                <div className="flex gap-2 mb-2">{brandKit.colors.map((c, i) => <div key={i} className="flex flex-col items-center gap-1"><div className="w-8 h-8 rounded-full border border-gray-600" style={{backgroundColor: c.hex}}></div><p className="text-xs text-gray-400">{c.hex}</p></div>)}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><p className="text-gray-400">Heading</p><p className="text-sm text-white">{brandKit.typography.headingFont}</p></div>
                                    <div><p className="text-gray-400">Body</p><p className="text-sm text-white">{brandKit.typography.bodyFont}</p></div>
                                </div>
                            </div>
                            {/* Mockups */}
                            <div>
                                <h3 className="text-base font-semibold text-teal-300 mb-2">Mockups</h3>
                                <div className="flex flex-wrap gap-2 mb-2">{MOCKUP_TYPES.map(type => <button key={type} onClick={() => handleGenerateMockup(type)} disabled={generatedMockups[type]?.status === 'loading'} className="text-xs bg-gray-600 hover:bg-gray-500 p-2 rounded-md disabled:bg-gray-700">{generatedMockups[type]?.status === 'loading' ? '...' : type}</button>)}</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {/* Fix: Cast the result of Object.entries to fix type inference issues. */}
                                    {(Object.entries(generatedMockups) as [string, MockupState][])
                                        .filter(([, m]) => m.status === 'success' && m.url)
                                        .map(([key, mockup]) => (
                                            <div key={key} className="relative group">
                                                <img src={mockup.url!} alt={`${key} Mockup`} className="rounded-md object-cover"/>
                                                <button onClick={() => downloadImage(mockup.url!, `mockup_${key.toLowerCase().replace(' ', '_')}.png`)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Download ${key} mockup`}>
                                                    <DownloadIcon className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                            {/* Social Post */}
                            <div>
                                <h3 className="text-base font-semibold text-teal-300 mb-2">Social Media</h3>
                                {!socialPost && <button onClick={handleGenerateSocialPost} className="text-xs bg-gray-600 hover:bg-gray-500 p-2 rounded-md">Generate Launch Post</button>}
                                {socialPost?.status === 'loading' && <p className="text-xs text-gray-400">Generating post...</p>}
                                {socialPost?.status === 'success' && socialPost.image && (
                                    <div className="flex gap-2 items-start">
                                        <div className="relative group w-1/3">
                                            <img src={socialPost.image} alt="Social media post" className="rounded-md"/>
                                            <button onClick={() => downloadImage(socialPost.image, 'social_post_image.png')} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download social post image">
                                                <DownloadIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-300 p-2 bg-gray-800 rounded-md w-2/3">{socialPost.caption}</p>
                                    </div>
                                )}
                            </div>
                            {/* Guidelines */}
                             <div>
                                <h3 className="text-base font-semibold text-teal-300 mb-2">Brand Guidelines</h3>
                                {!brandGuidelines && <button onClick={handleGenerateGuidelines} className="text-xs bg-gray-600 hover:bg-gray-500 p-2 rounded-md">Generate Guidelines</button>}
                                {brandGuidelines?.status === 'loading' && <p className="text-xs text-gray-400">Generating guidelines...</p>}
                                {brandGuidelines?.status === 'success' && <div className="grid grid-cols-2 gap-4 text-xs"><div><h4 className="font-semibold text-green-400 mb-1">Dos</h4><ul className="list-disc list-inside space-y-1">{brandGuidelines.dos?.map((d,i)=><li key={i}>{d}</li>)}</ul></div><div><h4 className="font-semibold text-red-400 mb-1">Don'ts</h4><ul className="list-disc list-inside space-y-1">{brandGuidelines.donts?.map((d,i)=><li key={i}>{d}</li>)}</ul></div></div>}
                            </div>
                        </div>
                    )}
                </div>
             )}
        </div>
      </main>
    </div>
  );
};

export default App;
