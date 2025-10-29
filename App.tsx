
import React, { useState, useCallback, ChangeEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { 
    editImageWithGemini, 
    createImageWithGemini, 
    getInitialBrandKit,
    generateMockup,
    generateLogoVariation,
    generateSocialPost,
    generateBrandGuidelines,
    generateBrandName,
    generateSloganSuggestions,
    generateNameFromLogo,
    generateSloganSuggestionsFromLogo
} from './services/geminiService';

type Mode = 'create' | 'edit';
type Theme = 'light' | 'dark';
type BrandKit = {
  colors: { hex: string }[];
  typography: { headingFont: string; bodyFont: string };
};
type Status = 'idle' | 'loading' | 'error' | 'success';
type MockupState = {
  status: Status;
  url?: string;
  error?: string;
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
const RevertIcon: React.FC<{className?: string}> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg> );
const SunIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.95-4.243-1.59-1.591M3.75 12H6m4.243-4.95-1.59 1.591M12 12a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg> );
const MoonIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg> );


// --- LOADING SPINNERS ---
const PulsingSparklesLoader: React.FC<{text: string}> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-6">
        <SparklesIcon className="h-20 w-20 text-amber-500/40 dark:text-amber-500/40 animate-pulse" />
        <p className="text-amber-700 dark:text-amber-400 font-medium tracking-wide">{text}</p>
    </div>
);

// --- UI COMPONENTS ---
const Section: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="space-y-3">
        <label className="text-sm font-semibold text-warm-gray-800 dark:text-slate-300 tracking-wide">{title}</label>
        {children}
    </div>
);

// --- DATA ---
const DESIGNER_PERSONAS = [
    { name: 'Swiss Master', value: 'a minimalist, geometric, clean style using sans-serif typography, embodying Swiss design principles.' },
    { name: 'Vintage Artisan', value: 'a style with textures, stamps, and seals, using serif and script typography for a vintage, handcrafted feel.' },
    { name: 'Tech Innovator', value: 'a futuristic, abstract style with gradients and modern aesthetics.' },
    { name: 'Playful Illustrator', value: 'a fun, friendly, hand-drawn style, possibly featuring a character or mascot.' },
    { name: 'Corporate Minimalist', value: 'a clean, modern, and professional style, often using simple geometric shapes and sans-serif fonts for a corporate feel.' },
    { name: 'Luxury Classic', value: 'an elegant and sophisticated style, featuring refined serif fonts, monograms, and a timeless, high-end aesthetic.' },
    { name: 'Eco Organic', value: 'a natural, earthy style with hand-drawn elements, textured effects, and organic shapes, conveying sustainability.' },
    { name: 'Bold Pop', value: 'a vibrant, energetic style using bold graphics, bright colors, and playful typography inspired by pop art.' },
];
const MOCKUP_TYPES = ['Business Card', 'Coffee Cup', 'T-Shirt', 'Storefront Sign', 'Social Media Profile', 'Website on Laptop', 'Tote Bag', 'Letterhead'];

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<Mode>('create');
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.className as Theme));
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Universal State
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [brandName, setBrandName] = useState('');
  const [slogan, setSlogan] = useState('');
  
  // Create Mode State
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
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [generatedMockups, setGeneratedMockups] = useState<Record<string, MockupState>>({});
  const [socialPost, setSocialPost] = useState<{status: Status, image?: string, caption?: string} | null>(null);
  const [brandGuidelines, setBrandGuidelines] = useState<{status: Status, dos?: string[], donts?: string[]} | null>(null);
  const [logoVariations, setLogoVariations] = useState<Record<string, {status: Status, url?: string}>>({});

  // Text generation loading state
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  // Slogan Modal State
  const [isSloganModalOpen, setIsSloganModalOpen] = useState(false);
  const [sloganSuggestions, setSloganSuggestions] = useState<string[]>([]);
  const [sloganGenerationStatus, setSloganGenerationStatus] = useState<Status>('idle');
  const [sloganGenerationError, setSloganGenerationError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // --- EFECTOS DE INTERACTIVIDAD IA ---
  useEffect(() => {
    // 1. Fondo Viviente: Controla la velocidad de la animación del fondo según el estado de la IA.
    document.body.style.setProperty(
        '--gradient-animation-duration',
        status === 'loading' ? '3s' : '15s'
    );
  }, [status]);
  
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [editHistory]);
  
  useEffect(() => {
    if (brandKit) {
        const timer = setTimeout(() => setShowBrandKit(true), 100);
        return () => clearTimeout(timer);
    } else {
        setShowBrandKit(false);
    }
  }, [brandKit]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        document.documentElement.className = newTheme;
        return newTheme;
    });
  }, []);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setGeneratedImage(null);
    setPrompt('');
    setBrandName('');
    setSlogan('');
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
        setEditHistory([{ user: 'Original', image: base64Preview }]);
      } catch (err) {
        setError('Failed to read the image file.');
        setStatus('error');
      }
    }
  }, [handleReset]);

  const handleGuidedSubmit = useCallback(async () => {
    let fullPrompt = `A professional, high-quality logo for a brand named '${brandName}' in the ${industry} industry.`;
    if (slogan) fullPrompt += ` Their slogan is "${slogan}".`;
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
  }, [brandName, industry, vision, designerPersona, inspirationFiles, slogan]);

  const handleEditSubmit = useCallback(async () => {
    if (!prompt || !generatedImage || !originalImageFile) return;
    const currentPrompt = prompt;
    setPrompt('');
    setStatus('loading');
    setError(null);
    try {
        const editInstruction = `Generate a new image by applying the following edit to the provided logo: '${currentPrompt}'. You are an expert logo designer. When asked to change text, you must PERFECTLY match the original font, color, 3D effects, texture, lighting, and perspective. Apply the edit precisely and do not alter any other part of the logo unless requested. The output must be the newly generated image with the edits applied.`;
        const newImageBase64 = await editImageWithGemini( generatedImage, originalImageFile.type, editInstruction );
        setGeneratedImage(newImageBase64);
        setEditHistory(prev => [...prev, { user: currentPrompt, image: newImageBase64 }]);
        setStatus('success');
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        setStatus('error');
    }
}, [prompt, generatedImage, originalImageFile]);

  const handleRevertToVersion = useCallback((index: number) => {
    const versionToRestore = editHistory[index];
    if (!versionToRestore) return;

    setGeneratedImage(versionToRestore.image);
    setEditHistory(editHistory.slice(0, index + 1));
  }, [editHistory]);

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
        const errorMessage = e instanceof Error ? e.message : "Failed to generate mockup.";
        setGeneratedMockups(prev => ({ ...prev, [mockupType]: { status: 'error', error: errorMessage } }));
    }
  };

  const handleGenerateLogoVariation = async (variation: 'white' | 'profile_picture' | 'transparent_bg') => {
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

 const handleGenerateName = async () => {
    setIsGeneratingName(true);
    setError(null);
    try {
      let result = '';
      if (activeMode === 'create') {
        if (!industry) {
            setError("Please enter an industry to generate a name.");
            return;
        }
        result = await generateBrandName(industry, vision);
        setBrandName(result);
      } else { // edit mode
        if (!generatedImage) return;
        result = await generateNameFromLogo(generatedImage);
        setBrandName(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate name suggestion.');
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleOpenSloganModal = async () => {
    if (!brandName) {
        setError("Please enter a brand name to generate slogans.");
        return;
    }
    setIsSloganModalOpen(true);
    setSloganGenerationStatus('loading');
    setSloganSuggestions([]);
    setSloganGenerationError(null);
    try {
        const results = activeMode === 'create'
            ? await generateSloganSuggestions(brandName, industry, vision)
            : await generateSloganSuggestionsFromLogo(generatedImage!, brandName);

        setSloganSuggestions(results);
        setSloganGenerationStatus('success');
    } catch (err) {
        setSloganGenerationError(err instanceof Error ? err.message : 'Failed to generate suggestions.');
        setSloganGenerationStatus('error');
    }
};

const handleSelectSlogan = (selectedSlogan: string) => {
    setSlogan(selectedSlogan);
    setIsSloganModalOpen(false);
};

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const isCreateDisabled = status === 'loading' || !brandName || !industry;
  
  const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="block w-full rounded-lg border-0 bg-white/70 dark:bg-warm-gray-950/70 py-3 px-4 text-charcoal-800 dark:text-slate-200 shadow-inner shadow-black/5 dark:shadow-black/20 ring-1 ring-warm-gray-300 dark:ring-warm-gray-700/80 placeholder:text-warm-gray-700/60 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-500 focus:shadow-[0_0_15px_2px_rgba(245,158,11,0.3)] transition-all" />
  );
  
  const TextareaField = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className="block w-full rounded-lg border-0 bg-white/70 dark:bg-warm-gray-950/70 py-3 px-4 text-charcoal-800 dark:text-slate-200 shadow-inner shadow-black/5 dark:shadow-black/20 ring-1 ring-warm-gray-300 dark:ring-warm-gray-700/80 placeholder:text-warm-gray-700/60 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-500 focus:shadow-[0_0_15px_2px_rgba(245,158,11,0.3)] transition-all" />
  );

  const ThemeToggle = () => (
    <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full text-warm-gray-700 dark:text-slate-400 hover:bg-warm-gray-200 dark:hover:bg-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-warm-gray-950 transition-all duration-300" aria-label="Toggle theme">
        {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
    </button>
  );


  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-12">
      <ThemeToggle />
      <header className="text-center mb-12 animate-fadeInUp">
        <h1 className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 pb-2">
          AI Brand Co-pilot
        </h1>
        <p className="mt-2 text-lg text-warm-gray-700 dark:text-slate-400 max-w-2xl mx-auto">Your partner in crafting a unique brand identity from vision to reality.</p>
      </header>

      <main className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- INPUT PANEL --- */}
        <div className="bg-white/60 dark:bg-warm-gray-900/60 backdrop-blur-xl rounded-3xl border border-warm-gray-200 dark:border-warm-gray-700/80 p-8 flex flex-col space-y-6">
            <div className="flex justify-between items-center border-b border-warm-gray-200 dark:border-warm-gray-700 pb-5">
                <div className="flex bg-warm-gray-100 dark:bg-warm-gray-800/80 p-1.5 rounded-xl space-x-1">
                    <button onClick={() => handleModeChange('create')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${activeMode === 'create' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-500' : 'text-warm-gray-700 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-warm-gray-200 dark:hover:bg-warm-gray-700/50'}`}>Create</button>
                    <button onClick={() => handleModeChange('edit')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${activeMode === 'edit' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-500' : 'text-warm-gray-700 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-warm-gray-200 dark:hover:bg-warm-gray-700/50'}`}>Edit</button>
                </div>
                 <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-sm text-warm-gray-700 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-warm-gray-200 dark:hover:bg-warm-gray-700/50 rounded-lg transition-colors duration-300" aria-label="Start Over">
                    <RefreshIcon className="h-4 w-4" />
                    Start Over
                </button>
            </div>

            {/* CREATE MODE: GUIDED ASSISTANT */}
            {activeMode === 'create' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold text-charcoal-900 dark:text-slate-100">Intelligent Design Brief</h2>
                    <Section title="Brand Name & Industry">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <InputField type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g., The Daily Grind" />
                                <button onClick={handleGenerateName} disabled={isGeneratingName || !industry} title="Suggest a name" className="absolute inset-y-0 right-0 flex items-center pr-3 text-amber-600 hover:text-amber-500 disabled:text-warm-gray-300 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-300"><WandIcon className="h-5 w-5"/></button>
                            </div>
                           <InputField type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., Coffee Shop" />
                        </div>
                    </Section>
                    <Section title="Slogan (optional)">
                        <div className="relative">
                           <InputField type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="e.g., Your daily dose of inspiration." />
                           <button onClick={handleOpenSloganModal} disabled={sloganGenerationStatus === 'loading' || !brandName} title="Suggest slogans" className="absolute inset-y-0 right-0 flex items-center pr-3 text-amber-600 hover:text-amber-500 disabled:text-warm-gray-300 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors duration-300"><WandIcon className="h-5 w-5"/></button>
                        </div>
                    </Section>
                     <Section title="Describe your vision (optional)">
                        <TextareaField value={vision} onChange={(e) => setVision(e.target.value)} rows={3} placeholder="e.g., A mix of vintage engraving and modern tech..." />
                    </Section>
                    <Section title="Designer Persona (optional)">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {DESIGNER_PERSONAS.map(p => <button key={p.name} onClick={() => setDesignerPersona(p.value)} className={`text-center p-3 text-xs font-semibold rounded-lg transition-all duration-300 border active:scale-95 transform hover:-translate-y-0.5 ${designerPersona === p.value ? 'bg-amber-100/50 dark:bg-amber-900/50 border-amber-500 text-amber-700 dark:text-amber-400 shadow-lg shadow-amber-500/10' : 'bg-warm-gray-100 dark:bg-warm-gray-800 text-warm-gray-800 dark:text-slate-300 hover:bg-warm-gray-200/60 dark:hover:bg-warm-gray-700/60 border-warm-gray-300 dark:border-warm-gray-700'}`}>{p.name}</button>)}
                        </div>
                    </Section>
                    <Section title="Visual Inspiration (optional, up to 3)">
                        <div className="flex items-center gap-4">
                            <label htmlFor="inspiration-upload" className="cursor-pointer rounded-lg bg-warm-gray-200 dark:bg-warm-gray-700 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-500 hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 transition-colors duration-300 active:scale-95">Upload Images</label>
                            <input id="inspiration-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleInspirationUpload} />
                            <div className="flex gap-3">
                                {inspirationPreviews.map((src, i) => <img key={i} src={src} className="h-14 w-14 rounded-lg object-cover border-2 border-warm-gray-300 dark:border-warm-gray-700 shadow-md"/>)}
                            </div>
                        </div>
                    </Section>
                    <div className="pt-4">
                        <button onClick={handleGuidedSubmit} disabled={isCreateDisabled} className={`w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 disabled:from-warm-gray-300 disabled:to-warm-gray-300 dark:disabled:from-warm-gray-700 dark:disabled:to-warm-gray-700 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 active:scale-95 disabled:transform-none ${!isCreateDisabled ? 'shimmer-effect' : ''}`}>Create New Logo <SparklesIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            )}
            
            {/* EDIT MODE: CONVERSATIONAL CHAT */}
            {activeMode === 'edit' && (
                 <div className="flex flex-col h-full">
                    {!generatedImage ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                           <h2 className="text-2xl font-semibold text-charcoal-900 dark:text-slate-100 mb-4">Upload a Logo to Edit</h2>
                           <div className="w-full mt-2 flex justify-center rounded-xl border-2 border-dashed border-warm-gray-300 dark:border-warm-gray-600 px-6 py-12 hover:border-amber-400 transition-colors duration-300 bg-warm-gray-100/50 dark:bg-warm-gray-800/20">
                                <input id="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                                <div className="text-center">
                                    <UploadIcon className="mx-auto h-12 w-12 text-warm-gray-700/60 dark:text-slate-500" />
                                    <div className="mt-4 flex text-sm text-warm-gray-700/80 dark:text-slate-400"><label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-semibold text-amber-600 hover:text-amber-500"><span>Upload a file</span></label><p className="pl-1">or drag and drop</p></div>
                                    <p className="text-xs text-warm-gray-700/60 dark:text-slate-500">PNG, JPG, etc.</p>
                                </div>
                           </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-grow min-h-0">
                            <div className="mb-4 p-4 bg-warm-gray-100 dark:bg-warm-gray-950/40 rounded-xl border border-warm-gray-200 dark:border-warm-gray-800">
                                <div className="relative">
                                     <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand Name" className="w-full bg-transparent text-xl font-semibold text-charcoal-900 dark:text-white border-none focus:ring-0 p-1 placeholder:text-warm-gray-700/60 dark:placeholder:text-slate-500"/>
                                      <button onClick={handleGenerateName} disabled={isGeneratingName} title="Suggest a name based on the logo" className="absolute inset-y-0 right-0 flex items-center pr-2 text-amber-600 hover:text-amber-500 disabled:text-warm-gray-300 dark:disabled:text-slate-500 disabled:cursor-not-allowed"><WandIcon className="h-5 w-5"/></button>
                                </div>
                                <div className="relative">
                                    <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" className="w-full bg-transparent text-sm text-warm-gray-700/80 dark:text-slate-400 border-none focus:ring-0 p-1 placeholder:text-warm-gray-700/60 dark:placeholder:text-slate-500"/>
                                    <button onClick={handleOpenSloganModal} disabled={sloganGenerationStatus === 'loading' || !brandName} title="Suggest a slogan based on the logo" className="absolute inset-y-0 right-0 flex items-center pr-2 text-amber-600 hover:text-amber-500 disabled:text-warm-gray-300 dark:disabled:text-slate-500 disabled:cursor-not-allowed"><WandIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto pr-2 space-y-5 mb-4 -mr-2">
                                {editHistory.map((entry, index) => {
                                    const isOriginal = index === 0;
                                    const altText = isOriginal ? 'Original Image' : `Edit step ${index}`;
                                    const filename = isOriginal ? 'logo_original.png' : `logo_edit_${index}.png`;

                                    return (
                                        <React.Fragment key={index}>
                                            {isOriginal && ( <p className="text-center text-xs text-warm-gray-700/60 dark:text-slate-500 tracking-wider font-semibold uppercase">Original Image</p> )}
                                            {!isOriginal && (
                                                <div className="flex justify-end">
                                                    <p className="bg-gradient-to-br from-amber-600 to-amber-700 text-white text-sm rounded-xl py-2.5 px-4 max-w-sm text-left shadow-lg">{entry.user}</p>
                                                </div>
                                            )}
                                            <div className="flex justify-start">
                                                <div className="relative group bg-warm-gray-100 dark:bg-warm-gray-800 p-2.5 rounded-xl border border-warm-gray-200 dark:border-warm-gray-700/50">
                                                    <img src={entry.image} alt={altText} className="max-h-36 rounded-lg object-contain" />
                                                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <button onClick={() => downloadImage(entry.image, filename)} className="bg-black/60 text-white p-1.5 rounded-full" aria-label={`Download ${altText}`} title="Download this version" >
                                                            <DownloadIcon className="h-4 w-4"/>
                                                        </button>
                                                        {index < editHistory.length - 1 && (
                                                            <button onClick={() => handleRevertToVersion(index)} className="bg-black/60 text-white p-1.5 rounded-full" aria-label={`Use this version and continue editing from here`} title="Use this version" >
                                                                <RevertIcon className="h-4 w-4"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="relative mt-auto">
                                <InputField type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && status !== 'loading' && handleEditSubmit()} placeholder="e.g., Change the color to blue..." className="py-3.5 pl-4 pr-14 disabled:opacity-60" disabled={status === 'loading'} />
                                <button onClick={handleEditSubmit} disabled={status === 'loading' || !prompt} className="absolute inset-y-0 right-0 flex items-center pr-4 disabled:opacity-50 text-amber-600 hover:text-amber-500 transition-colors duration-300"> <SendIcon className="h-6 w-6"/> </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* --- OUTPUT PANEL --- */}
        <div className="bg-white/60 dark:bg-warm-gray-900/60 backdrop-blur-xl rounded-3xl border border-warm-gray-200 dark:border-warm-gray-700/80 p-8 flex flex-col items-center justify-center min-h-[600px] space-y-4">
            {status === 'loading' && <PulsingSparklesLoader text={brandKit ? "Building Brand Kit..." : "Generating Logo..."} />}
            {status === 'error' && error && (
                <div className="text-center text-red-500 dark:text-red-400 space-y-6 bg-red-500/10 dark:bg-red-900/20 p-8 rounded-2xl border border-red-500/20 dark:border-red-500/30 animate-fadeInUp">
                    <div><p className="font-semibold text-lg text-red-700 dark:text-red-300">Generation Failed</p><p className="text-sm mt-2 max-w-sm">{error}</p></div>
                    <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-md bg-warm-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-warm-gray-800 transition-colors duration-300"><RefreshIcon className="h-5 w-5" />Start Over</button>
                </div>
            )}
            {status !== 'loading' && !generatedImage && (
                <div className="text-center text-warm-gray-700/60 dark:text-slate-500 space-y-3">
                    <SparklesIcon className="h-20 w-20 mx-auto text-warm-gray-300/80 dark:text-warm-gray-600/70"/>
                    <h3 className="text-xl font-semibold text-charcoal-800 dark:text-slate-300">Your brand identity awaits</h3>
                    <p className="mt-1 text-base">Use the intelligent brief to get started.</p>
                </div>
            )}
            {generatedImage && (
                <div className="w-full h-full text-center space-y-6 overflow-y-auto pr-2 -mr-4 animate-fadeInUp">
                    <div className="relative group inline-block ai-reveal">
                        <img src={generatedImage} alt="Generated logo" className="max-h-64 mx-auto rounded-lg object-contain bg-warm-gray-100 dark:bg-warm-gray-800/30 p-2" />
                        <button onClick={() => downloadImage(generatedImage, 'logo.png')} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-label="Download logo">
                            <DownloadIcon className="h-5 w-5"/>
                        </button>
                    </div>

                    <div className="w-full pt-4 space-y-4">
                        {logoVariations.transparent_bg?.status !== 'success' && (
                            <button onClick={() => handleGenerateLogoVariation('transparent_bg')} disabled={logoVariations.transparent_bg?.status === 'loading'} className="inline-flex items-center gap-2 rounded-lg bg-warm-gray-200 dark:bg-warm-gray-700 px-4 py-2.5 text-sm font-semibold text-charcoal-800 dark:text-white hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 disabled:bg-warm-gray-100 dark:disabled:bg-warm-gray-800 disabled:text-warm-gray-700/50 dark:disabled:text-slate-500 transition-all duration-300 active:scale-95">
                                <WandIcon className="h-5 w-5" />
                                {logoVariations.transparent_bg?.status === 'loading' ? 'Processing...' : 'Remove Background'}
                            </button>
                        )}
                        {logoVariations.transparent_bg?.url && (
                            <div className="flex flex-col items-center mt-2 animate-fadeInUp">
                                <p className="text-sm font-medium text-charcoal-800 dark:text-slate-300 mb-2">Transparent Background</p>
                                <div className="relative group">
                                    <div className={`h-28 w-28 rounded-lg p-1.5 flex items-center justify-center border border-warm-gray-300 dark:border-warm-gray-700 ${theme === 'light' ? 'checkerboard-light' : 'checkerboard-dark'}`}>
                                        <img src={logoVariations.transparent_bg.url} alt="Transparent background logo variation" className="h-full w-full object-contain"/>
                                    </div>
                                    <button onClick={() => downloadImage(logoVariations.transparent_bg.url!, 'logo_transparent_bg.png')} className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download transparent background logo">
                                        <DownloadIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {!brandKit && (
                        <>
                         <div className="w-full border-t border-warm-gray-200 dark:border-warm-gray-700/80 my-4"></div>
                         <button onClick={handleGenerateInitialBrandKit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 transition-all duration-300 transform hover:-translate-y-1 active:scale-95"><WandIcon className="h-5 w-5" />Build Brand Kit</button>
                        </>
                    )}
                    
                    {brandKit && (
                        <div className={`text-left bg-warm-gray-100/50 dark:bg-warm-gray-950/40 p-6 rounded-2xl border border-warm-gray-200 dark:border-warm-gray-700/50 space-y-8 transition-opacity duration-700 ${showBrandKit ? 'opacity-100' : 'opacity-0'}`}>
                            {/* Downloads */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-500 tracking-wide">Download Assets</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                     <button onClick={() => downloadImage(generatedImage, 'logo_color.png')} className="text-sm font-semibold bg-amber-200/70 dark:bg-amber-800/70 hover:bg-amber-300/70 dark:hover:bg-amber-700/70 text-amber-800 dark:text-amber-200 p-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors duration-300 active:scale-95"><DownloadIcon className="h-4 w-4" />Color Logo</button>
                                     <button onClick={() => handleGenerateLogoVariation('white')} disabled={logoVariations.white?.status === 'loading'} className="text-sm font-semibold bg-warm-gray-200 dark:bg-warm-gray-700 hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 p-2.5 rounded-lg disabled:bg-warm-gray-100 dark:disabled:bg-warm-gray-800 transition-colors duration-300 active:scale-95">{logoVariations.white?.status === 'loading' ? 'Generating...' : 'White Logo'}</button>
                                     <button onClick={() => handleGenerateLogoVariation('profile_picture')} disabled={logoVariations.profile_picture?.status === 'loading'} className="text-sm font-semibold bg-warm-gray-200 dark:bg-warm-gray-700 hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 p-2.5 rounded-lg disabled:bg-warm-gray-100 dark:disabled:bg-warm-gray-800 transition-colors duration-300 active:scale-95">{logoVariations.profile_picture?.status === 'loading' ? 'Generating...' : 'Profile Picture'}</button>
                                </div>
                                 <div className="flex items-start gap-4 mt-3">
                                     {logoVariations.white?.url && (
                                        <div className="relative group animate-fadeInUp">
                                            <img src={logoVariations.white.url} alt="White logo variation" className="h-20 w-20 object-contain rounded-lg bg-warm-gray-800 p-1.5 border border-warm-gray-700"/>
                                            <button onClick={() => downloadImage(logoVariations.white.url!, 'logo_white.png')} className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download white logo">
                                                <DownloadIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    )}
                                    {logoVariations.profile_picture?.url && (
                                        <div className="relative group animate-fadeInUp">
                                            <img src={logoVariations.profile_picture.url} alt="Profile picture variation" className="h-20 w-20 object-cover rounded-full border-2 border-warm-gray-300 dark:border-warm-gray-700"/>
                                            <button onClick={() => downloadImage(logoVariations.profile_picture.url!, 'logo_profile_picture.png')} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download profile picture">
                                                <DownloadIcon className="h-4 w-4"/>
                                            </button>
                                        </div>
                                    )}
                                 </div>
                            </div>
                            {/* Palette & Typography */}
                             <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-500 tracking-wide">Core Identity</h3>
                                <div className="flex gap-4 mb-3">{brandKit.colors.map((c, i) => <div key={i} className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-full border-2 border-warm-gray-300 dark:border-warm-gray-600 shadow-md transition-transform hover:scale-110" style={{backgroundColor: c.hex}} title={c.hex}></div><p className="text-xs text-warm-gray-700/80 dark:text-slate-400 font-mono">{c.hex.toUpperCase()}</p></div>)}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-warm-gray-200/50 dark:bg-warm-gray-800/50 p-4 rounded-lg">
                                    <div><p className="text-warm-gray-700/80 dark:text-slate-400 text-xs uppercase tracking-wider">Heading</p><p className="text-2xl text-charcoal-900 dark:text-white font-semibold mt-1" style={{fontFamily: `'${brandKit.typography.headingFont}', sans-serif`}}>{brandKit.typography.headingFont}</p></div>
                                    <div><p className="text-warm-gray-700/80 dark:text-slate-400 text-xs uppercase tracking-wider">Body</p><p className="text-lg text-charcoal-900 dark:text-white mt-2" style={{fontFamily: `'${brandKit.typography.bodyFont}', sans-serif`}}>{brandKit.typography.bodyFont}</p></div>
                                </div>
                            </div>
                            {/* Mockups */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-500 tracking-wide">Mockups</h3>
                                <div className="flex flex-wrap gap-2 mb-3">{MOCKUP_TYPES.map(type => <button key={type} onClick={() => handleGenerateMockup(type)} disabled={generatedMockups[type]?.status === 'loading'} className="text-xs font-semibold bg-warm-gray-200 dark:bg-warm-gray-700 hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 px-3 py-1.5 rounded-full disabled:bg-warm-gray-100 dark:disabled:bg-warm-gray-800 transition-colors duration-300 active:scale-95">{generatedMockups[type]?.status === 'loading' ? 'Generating...' : type}</button>)}</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(generatedMockups).map(([key, mockup]: [string, MockupState]) => (
                                        <div key={key} className="relative group aspect-video bg-warm-gray-200 dark:bg-warm-gray-800 rounded-lg flex items-center justify-center border border-warm-gray-300 dark:border-warm-gray-700/50" title={mockup.error}>
                                            {mockup.status === 'loading' && <div className="w-full h-full bg-warm-gray-300/50 dark:bg-warm-gray-700/50 rounded-lg animate-pulse"></div>}
                                            {mockup.status === 'error' && (
                                                <div className="text-center p-2">
                                                    <p className="text-xs text-red-500 dark:text-red-400 font-semibold">Failed</p>
                                                    <button onClick={() => handleGenerateMockup(key)} className="mt-1 text-xs bg-red-500/20 dark:bg-red-800/70 hover:bg-red-500/30 dark:hover:bg-red-700/70 p-1.5 rounded-md transition-colors duration-300">Retry</button>
                                                </div>
                                            )}
                                            {mockup.status === 'success' && mockup.url && (
                                                <>
                                                    <img src={mockup.url} alt={`${key} Mockup`} className="rounded-lg object-cover w-full h-full"/>
                                                    <button onClick={() => downloadImage(mockup.url!, `mockup_${key.toLowerCase().replace(/ /g, '_')}.png`)} className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Download ${key} mockup`}>
                                                        <DownloadIcon className="h-4 w-4"/>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Social Post & Guidelines */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-500 tracking-wide">Social Media</h3>
                                    {!socialPost && <button onClick={handleGenerateSocialPost} className="text-sm font-semibold bg-warm-gray-200 dark:bg-warm-gray-700 hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 px-4 py-2 rounded-lg transition-colors duration-300 active:scale-95">Generate Launch Post</button>}
                                    {socialPost?.status === 'loading' && <p className="text-sm text-warm-gray-700/80 dark:text-slate-400">Generating post...</p>}
                                    {socialPost?.status === 'success' && socialPost.image && (
                                        <div className="flex gap-4 items-start animate-fadeInUp">
                                            <div className="relative group w-1/3 flex-shrink-0">
                                                <img src={socialPost.image} alt="Social media post" className="rounded-lg aspect-square object-cover"/>
                                                <button onClick={() => downloadImage(socialPost.image, 'social_post_image.png')} className="absolute top-1.5 right-1.5 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Download social post image">
                                                    <DownloadIcon className="h-4 w-4"/>
                                                </button>
                                            </div>
                                            <p className="text-sm text-charcoal-800 dark:text-slate-300 p-3 bg-warm-gray-200/80 dark:bg-warm-gray-800/80 rounded-lg ">{socialPost.caption}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-500 tracking-wide">Brand Guidelines</h3>
                                    {!brandGuidelines && <button onClick={handleGenerateGuidelines} className="text-sm font-semibold bg-warm-gray-200 dark:bg-warm-gray-700 hover:bg-warm-gray-300 dark:hover:bg-warm-gray-600 px-4 py-2 rounded-lg transition-colors duration-300 active:scale-95">Generate Guidelines</button>}
                                    {brandGuidelines?.status === 'loading' && <p className="text-sm text-warm-gray-700/80 dark:text-slate-400">Generating guidelines...</p>}
                                    {brandGuidelines?.status === 'success' && <div className="grid grid-cols-2 gap-4 text-sm bg-warm-gray-200/50 dark:bg-warm-gray-800/50 p-4 rounded-lg animate-fadeInUp"><div><h4 className="font-semibold text-green-600/80 dark:text-green-400/80 mb-1">Dos</h4><ul className="list-disc list-inside space-y-1 text-charcoal-800 dark:text-slate-300">{brandGuidelines.dos?.map((d,i)=><li key={i}>{d}</li>)}</ul></div><div><h4 className="font-semibold text-red-600/80 dark:text-red-400/80 mb-1">Don'ts</h4><ul className="list-disc list-inside space-y-1 text-charcoal-800 dark:text-slate-300">{brandGuidelines.donts?.map((d,i)=><li key={i}>{d}</li>)}</ul></div></div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
             )}
        </div>
      </main>
      
      {/* --- SLOGAN SUGGESTIONS MODAL --- */}
      {isSloganModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setIsSloganModalOpen(false)}>
            <div className="bg-warm-gray-100 dark:bg-warm-gray-900 border border-warm-gray-200 dark:border-warm-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl shadow-amber-900/20 dark:shadow-amber-900/40 animate-fadeInUp" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-amber-700 dark:text-amber-500">Slogan Suggestions</h2>
                    <button onClick={() => setIsSloganModalOpen(false)} className="text-warm-gray-700/80 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-white transition-colors duration-300"><XIcon className="h-6 w-6"/></button>
                </div>

                {sloganGenerationStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center p-8 space-y-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                        <p className="text-sm text-warm-gray-800 dark:text-slate-300">Generating ideas...</p>
                    </div>
                )}
                
                {sloganGenerationStatus === 'error' && (
                     <div className="text-center text-red-500 dark:text-red-400 p-6 bg-red-500/10 dark:bg-red-900/20 rounded-lg border border-red-500/20 dark:border-red-500/30">
                        <p className="font-semibold text-red-700 dark:text-red-300">Generation Failed</p>
                        <p className="text-sm mt-1">{sloganGenerationError}</p>
                        <button onClick={handleOpenSloganModal} className="mt-4 inline-flex items-center gap-2 rounded-md bg-warm-gray-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-warm-gray-800 transition-colors duration-300"><RefreshIcon className="h-4 w-4" />Retry</button>
                    </div>
                )}

                {sloganGenerationStatus === 'success' && (
                    <div className="space-y-3">
                        {sloganSuggestions.map((slogan, index) => (
                             <button 
                                key={index} 
                                onClick={() => handleSelectSlogan(slogan)}
                                className="w-full text-left p-4 rounded-lg bg-white/70 dark:bg-warm-gray-800/70 hover:bg-warm-gray-200/80 dark:hover:bg-warm-gray-700/50 border border-warm-gray-300 dark:border-warm-gray-700 hover:border-amber-500 dark:hover:border-amber-500 transition-all duration-300 text-charcoal-800 dark:text-slate-200"
                            >
                                {slogan}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default App;