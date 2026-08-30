import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Sparkles,
  Sliders,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  ShoppingBag,
  Crown,
  ShieldCheck,
  Wind,
  Info,
  Wand2,
  Lock,
  Unlock,
} from 'lucide-react';
import { Product } from '../types';
import { formatIQD } from '../data/products';
import confetti from 'canvas-confetti';

// Real photorealistic image assets
import goldenJarBodyImg from '../assets/images/golden_jar_body_1787701016350.jpg';
import goldenJarLidImg from '../assets/images/golden_jar_lid_1787701028947.jpg';
import mabkharaImg from '../assets/images/arabic_mabkhara_1787701042802.jpg';

interface CustomBakhoorMixerProps {
  onAddToCart: (product: Product, quantity?: number) => void;
}

interface BakhoorIngredient {
  id: 'mabsous_oud' | 'mabsous_dust' | 'mabsous_sandal';
  name: string;
  enName: string;
  description: string;
  color: string;
  gradient: string;
  scentNote: string;
  diffusion: number;
  longevity: number;
}

const BAKHOOR_INGREDIENTS: BakhoorIngredient[] = [
  {
    id: 'mabsous_oud',
    name: 'مبسوس عود ملكي',
    enName: 'Royal Mabsous Oud',
    description: 'كسرات عود معتقة بزيوت شرقية فاخرة لفوحان ملكي وثبات ممتاز في المكان.',
    color: '#3E2723',
    gradient: 'from-[#4A2E18] to-[#2B1708]',
    scentNote: 'عود عميق، خشبي فاخر، فخم',
    diffusion: 96,
    longevity: 5,
  },
  {
    id: 'mabsous_dust',
    name: 'مبسوس تراب العود',
    enName: 'Mabsous Dust Oud',
    description: 'تراب ومسحوق العود الأصيل المعزز بالعنبر، يتميز بكثافة الدخان والانتشار السريع.',
    color: '#8D5B28',
    gradient: 'from-[#8D5B28] to-[#5C3813]',
    scentNote: 'ترابي دافئ، عنبري، كثيف الفوحان',
    diffusion: 94,
    longevity: 5,
  },
  {
    id: 'mabsous_sandal',
    name: 'مبسوس صندل فاخر',
    enName: 'Luxury Mabsous Sandalwood',
    description: 'خشب الصندل الميسوري النقي بلمسة سويتية ناعمة تهيمن عليها السكينة والهدوء.',
    color: '#C59B27',
    gradient: 'from-[#C59B27] to-[#8C6B1C]',
    scentNote: 'صندل كريمي، بلسمي، هادئ ومريح',
    diffusion: 90,
    longevity: 4,
  },
];

interface FrankincenseIngredient {
  id: 'luban_musk' | 'luban_rose';
  name: string;
  enName: string;
  description: string;
  color: string;
  gradient: string;
  scentNote: string;
  diffusion: number;
  longevity: number;
}

const FRANKINCENSE_INGREDIENTS: FrankincenseIngredient[] = [
  {
    id: 'luban_musk',
    name: 'لبان الذكر مسكي (بالرقية الشرعية)',
    enName: 'Musky Frankincense (Ruqyah Blessed)',
    description: 'لبان حوجري عماني درجة أولى مقروء عليه الرقية الشرعية ومعزز بعبير المسك الأبيض الصافي لطرد الطاقات السلبية.',
    color: '#D4C4A8',
    gradient: 'from-[#E6DCC8] to-[#B8A484]',
    scentNote: 'مسك أبيض، بلسمي نقي، رائحة نظافة وسكينة',
    diffusion: 96,
    longevity: 6,
  },
  {
    id: 'luban_rose',
    name: 'لبان الذكر ورد (بالرقية الشرعية)',
    enName: 'Rose Frankincense (Ruqyah Blessed)',
    description: 'حبات لبان ذكر أصلية مقروء عليها الرقية الشرعية ومخمرة بنفحات الورد الطائفي النقي لتعطير البيوت والمجالس.',
    color: '#D48B93',
    gradient: 'from-[#E8A5AC] to-[#B86B74]',
    scentNote: 'ورد طائفي فاخر، زهري أرستقراطي هادئ',
    diffusion: 92,
    longevity: 6,
  },
];

const FIXED_JAR_PRICE = 5000; // 5,000 IQD

export const CustomBakhoorMixer: React.FC<CustomBakhoorMixerProps> = ({ onAddToCart }) => {
  const [activeCategory, setActiveCategory] = useState<'bakhoor' | 'frankincense'>('bakhoor');
  const [isBouncing, setIsBouncing] = useState(false);

  // Percentages for Bakhoor category
  const [bakhoorPercentages, setBakhoorPercentages] = useState<{
    mabsous_oud: number;
    mabsous_dust: number;
    mabsous_sandal: number;
  }>({
    mabsous_oud: 40,
    mabsous_dust: 30,
    mabsous_sandal: 30,
  });

  // Percentages for Frankincense category (mixed together only)
  const [frankincensePercentages, setFrankincensePercentages] = useState<{
    luban_musk: number;
    luban_rose: number;
  }>({
    luban_musk: 50,
    luban_rose: 50,
  });

  const [hasCelebrated, setHasCelebrated] = useState(true);

  // Calculate totals based on active category
  const totalPercentage = useMemo(() => {
    if (activeCategory === 'bakhoor') {
      return (
        bakhoorPercentages.mabsous_oud +
        bakhoorPercentages.mabsous_dust +
        bakhoorPercentages.mabsous_sandal
      );
    } else {
      return frankincensePercentages.luban_musk + frankincensePercentages.luban_rose;
    }
  }, [activeCategory, bakhoorPercentages, frankincensePercentages]);

  const isComplete = totalPercentage === 100;
  const isOver = totalPercentage > 100;
  const remaining = 100 - totalPercentage;

  // Trigger celebration on exact 100%
  useEffect(() => {
    if (totalPercentage === 100 && !hasCelebrated) {
      setHasCelebrated(true);
      try {
        confetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#C5A059', '#E6C875', '#FFFFFF'],
        });
      } catch {
        // ignore
      }
    } else if (totalPercentage !== 100) {
      setHasCelebrated(false);
    }
  }, [totalPercentage, hasCelebrated]);

  // Adjust Bakhoor handler
  const handleBakhoorAdjust = (
    id: 'mabsous_oud' | 'mabsous_dust' | 'mabsous_sandal',
    delta: number
  ) => {
    setBakhoorPercentages((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, prev[id] + delta)),
    }));
  };

  const handleBakhoorSlider = (
    id: 'mabsous_oud' | 'mabsous_dust' | 'mabsous_sandal',
    val: number
  ) => {
    setBakhoorPercentages((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, val)),
    }));
  };

  // Adjust Frankincense handler
  const handleFrankincenseAdjust = (id: 'luban_musk' | 'luban_rose', delta: number) => {
    setFrankincensePercentages((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, prev[id] + delta)),
    }));
  };

  const handleFrankincenseSlider = (id: 'luban_musk' | 'luban_rose', val: number) => {
    setFrankincensePercentages((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, val)),
    }));
  };

  const handleResetCurrent = () => {
    if (activeCategory === 'bakhoor') {
      setBakhoorPercentages({ mabsous_oud: 0, mabsous_dust: 0, mabsous_sandal: 0 });
    } else {
      setFrankincensePercentages({ luban_musk: 0, luban_rose: 0 });
    }
  };

  // Calculate Blend Stats
  const blendStats = useMemo(() => {
    if (totalPercentage === 0) {
      return {
        diffusionRate: '0%',
        longevity: '—',
        scentProfile: 'يرجى إضافة مكونات للخلطة',
        notesSummary: 'فارغ',
      };
    }

    if (activeCategory === 'bakhoor') {
      let profile = '';
      if (bakhoorPercentages.mabsous_oud >= 50) {
        profile = 'طابع عودي ملكي دافئ وفواح مع عمق شرقي فاخر';
      } else if (bakhoorPercentages.mabsous_dust >= 50) {
        profile = 'طابع دخاني كثيف مع عنبر فواح وتراب العود الأصيل';
      } else if (bakhoorPercentages.mabsous_sandal >= 50) {
        profile = 'طابع بلسمي صندلي سويت وناعم مهدئ للأعصاب والمكان';
      } else {
        profile = 'توليفة متوازنة تجمع فخامة العود وكثافة التراب ونعومة الصندل';
      }

      const notesSummary = [
        bakhoorPercentages.mabsous_oud > 0
          ? `مبسوس عود (${bakhoorPercentages.mabsous_oud}%)`
          : null,
        bakhoorPercentages.mabsous_dust > 0
          ? `تراب العود (${bakhoorPercentages.mabsous_dust}%)`
          : null,
        bakhoorPercentages.mabsous_sandal > 0
          ? `مبسوس صندل (${bakhoorPercentages.mabsous_sandal}%)`
          : null,
      ]
        .filter(Boolean)
        .join(' + ');

      return {
        diffusionRate: 'فوحان ممتاز في المكان',
        longevity: '4 - 5 ساعات',
        longevityFull: 'من 4 إلى 5 ساعات (فوحان ممتاز في المكان)',
        scentProfile: profile,
        notesSummary,
      };
    } else {
      let profile = '';
      if (frankincensePercentages.luban_musk > frankincensePercentages.luban_rose) {
        profile = 'طابع مسكي بلسمي نقي ومريح للأعصاب مع بركة الرقية الشرعية';
      } else if (frankincensePercentages.luban_rose > frankincensePercentages.luban_musk) {
        profile = 'طابع وردي طائفي منعش وفواح لتعطير المنازل والغرف بالرقية الشرعية';
      } else {
        profile = 'مزيج فاخر ومتساوٍ من المسك الأبيض والورد الطائفي الصافي بالرقية الشرعية';
      }

      const notesSummary = [
        frankincensePercentages.luban_musk > 0
          ? `لبان مسكي (${frankincensePercentages.luban_musk}%)`
          : null,
        frankincensePercentages.luban_rose > 0
          ? `لبان ورد (${frankincensePercentages.luban_rose}%)`
          : null,
      ]
        .filter(Boolean)
        .join(' + ');

      return {
        diffusionRate: 'فوحان نقي وبركة مستمرة',
        longevity: 'من 5 إلى 6 ساعات',
        longevityFull: 'من 5 إلى 6 ساعات',
        scentProfile: profile,
        notesSummary: `${notesSummary} [مقروء عليه رقية شرعية]`,
      };
    }
  }, [activeCategory, bakhoorPercentages, frankincensePercentages, totalPercentage]);

  // Handle Add to Cart
  const handleAddCustomMix = () => {
    if (!isComplete) return;

    const isBakhoor = activeCategory === 'bakhoor';
    const customProduct: Product = {
      id: `custom-blend-${activeCategory}-${Date.now()}`,
      name: isBakhoor
        ? `خلطة بخور ملكية خاصة (${blendStats.notesSummary})`
        : `خلطة لبان الذكر بالرقية الشرعية (${blendStats.notesSummary})`,
      enName: isBakhoor ? 'Custom Royal Bakhoor Mix' : 'Custom Blessed Frankincense Mix',
      brand: 'كوزمتك الملكة - خلطتك الخاصة',
      category: isBakhoor ? 'bakhoor' : 'mixtures',
      price: FIXED_JAR_PRICE,
      image: goldenJarBodyImg,
      description: `خلطة مخصصة معبأة في علبة ذهبية ملكية محكمة الإغلاق. المكونات بالنسب المختارة: ${blendStats.notesSummary}. الطابع العطري: ${blendStats.scentProfile}. ثبات العطر والفوحان: ${blendStats.longevityFull}.`,
      shortDescription: `علبة ذهبية ملكية كاملة (100%): ${blendStats.notesSummary} بسعر 5,000 د.ع فقط.`,
      rating: 5.0,
      reviewCount: 32,
      inStock: true,
      isBestSeller: true,
      volumeOrWeight: 'علبة ذهبية فاخرة 100 غرام',
      benefits: [
        `ثبات العطر والفوحان: ${blendStats.longevityFull}`,
        isBakhoor
          ? 'مبسوس عود وصندل معتق بزيوت أصلية'
          : 'لبان حوجري مقروء عليه الرقية الشرعية لطرد الطاقات السلبية',
        'علبة ذهبية ملكية محكمة الإغلاق',
      ],
      howToUse: 'توضع كسرة أو حبة في المبخرة على فحم هادئ للاستمتاع برائحة فواحة تدوم طويلاً.',
      tags: ['خلطة مخصصة', 'علبة ذهبية', 'بخور', 'لبان ذكر', 'رقية شرعية', '5000 دينار'],
    };

    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 700);
    onAddToCart(customProduct, 1);
  };

  return (
    <section
      id="custom-bakhoor-section"
      className="py-12 sm:py-16 bg-gradient-to-b from-[#141417] via-[#0E0E10] to-[#070708] text-white border-y border-[#26262B] relative overflow-hidden"
    >
      {/* Ambient Lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 sm:space-y-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#222226] border border-[#3A3A40] px-4 py-1.5 rounded-full text-xs font-semibold text-[#D4AF37] shadow-inner">
            <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>خلطة ملكية حصرية حسب ذوقك</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            اصنع خلطة بخورك الخاصة
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#A1A1AA] leading-relaxed">
            اختر مكوناتك ونسب الخلط، وشاهد العلبة الذهبية الحقيقية تنغلق بإحكام فور الوصول إلى 100%، ودخان المبخرة الملكية المتصاعد.
          </p>

          {/* Fixed Price High-Contrast Badge */}
          <div className="pt-1">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C5A059]/20 via-[#D4AF37]/30 to-[#C5A059]/20 border border-[#D4AF37]/50 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-[#FFE58F]">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>سعر العلبة الذهبية الكاملة: <strong className="text-white text-base font-mono">5,000 دينار عراقي فقط</strong></span>
            </div>
          </div>

          {/* Category Tabs Switcher */}
          <div className="inline-flex p-1.5 bg-[#1B1B1F] border border-[#2B2B30] rounded-2xl gap-1.5 shadow-xl mt-4 max-w-lg w-full">
            <button
              onClick={() => setActiveCategory('bakhoor')}
              className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeCategory === 'bakhoor'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#121214] shadow-md shadow-[#C5A059]/25 font-black'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#25252A]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>القسم 1: البخورات القابلة للخلط</span>
            </button>

            <button
              onClick={() => setActiveCategory('frankincense')}
              className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeCategory === 'frankincense'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#121214] shadow-md shadow-[#C5A059]/25 font-black'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#25252A]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>القسم 2: لبان الذكر (رقية شرعية)</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Controls (Left) vs Interactive Jar & Mabkhara (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#18181B]/95 border border-[#27272A] rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6 backdrop-blur-md">
              
              {/* Rules & Header */}
              <div className="space-y-3 pb-4 border-b border-[#27272A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[#D4AF37]">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white">
                        {activeCategory === 'bakhoor'
                          ? 'تحديد نسب البخور (المجموع المستهدف: 100%)'
                          : 'تحديد نسب لبان الذكر بالرقية (المجموع المستهدف: 100%)'}
                      </h3>
                      <p className="text-[11px] text-[#A1A1AA]">
                        {activeCategory === 'bakhoor'
                          ? 'تخلط مع بعضها: مبسوس عود، مبسوس تراب العود، مبسوس صندل'
                          : 'يخلط المسكي والورد معاً فقط (ولا يخلطان مع باقي أنواع البخور)'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleResetCurrent}
                    className="text-xs text-[#A1A1AA] hover:text-[#D4AF37] flex items-center gap-1 transition-colors cursor-pointer bg-[#27272A] hover:bg-[#333336] px-2.5 py-1.5 rounded-lg border border-[#3F3F46]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير</span>
                  </button>
                </div>

                {/* Frankincense Ruqyah Notice */}
                {activeCategory === 'frankincense' && (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-amber-200">
                        تنبيه: لبان الذكر مقروء عليه رقية شرعية
                      </h4>
                      <p className="text-[11px] text-amber-300/80 leading-relaxed">
                        يقتصر الخلط بين نوعي لبان الذكر (المسكي والورد) فقط حتى 100%، ويكون صافياً ولا يخلط مع أي نوع بخور آخر للحفاظ على نقائه وبركته.
                      </p>
                    </div>
                  </div>
                )}

                {/* Progress Bar & Status */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#A1A1AA]">نسبة امتلاء العلبة الذهبية:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isComplete
                          ? 'text-emerald-400'
                          : isOver
                          ? 'text-rose-400'
                          : 'text-[#D4AF37]'
                      }`}
                    >
                      {totalPercentage}% / 100%
                    </span>
                  </div>

                  {/* Visual Multi-Segment Bar */}
                  <div className="h-3.5 w-full bg-[#27272A] rounded-full overflow-hidden p-0.5 border border-[#3F3F46] flex">
                    {activeCategory === 'bakhoor' ? (
                      <>
                        <motion.div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, bakhoorPercentages.mabsous_oud)}%`,
                            backgroundColor: BAKHOOR_INGREDIENTS[0].color,
                          }}
                        />
                        <motion.div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, bakhoorPercentages.mabsous_dust)}%`,
                            backgroundColor: BAKHOOR_INGREDIENTS[1].color,
                          }}
                        />
                        <motion.div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, bakhoorPercentages.mabsous_sandal)}%`,
                            backgroundColor: BAKHOOR_INGREDIENTS[2].color,
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <motion.div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, frankincensePercentages.luban_musk)}%`,
                            backgroundColor: FRANKINCENSE_INGREDIENTS[0].color,
                          }}
                        />
                        <motion.div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, frankincensePercentages.luban_rose)}%`,
                            backgroundColor: FRANKINCENSE_INGREDIENTS[1].color,
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Status Indicator text */}
                  <div className="text-[11px] font-medium pt-1">
                    {isComplete ? (
                      <div className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>اكتملت الخلطة 100%! العلبة الذهبية أُغلِقت بإحكام والمبخرة انطلقت بدخانها الفواح ✨</span>
                      </div>
                    ) : isOver ? (
                      <div className="text-rose-400 flex items-center gap-1.5 font-bold">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>تجاوزت النسبة بـ {totalPercentage - 100}%! يرجى تقليل النسب ليكون المجموع 100% تماماً.</span>
                      </div>
                    ) : (
                      <div className="text-[#A1A1AA] flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span>متبقي <strong className="text-white">{remaining}%</strong> للوصول إلى 100% وقفل قبق العلبة وتشغيل المبخرة.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sliders Container */}
              <div className="space-y-4">
                {activeCategory === 'bakhoor' ? (
                  /* 3 Bakhoor Items */
                  BAKHOOR_INGREDIENTS.map((item) => {
                    const currentPct = bakhoorPercentages[item.id];
                    return (
                      <div
                        key={item.id}
                        className="bg-[#1F1F23] border border-[#2E2E33] hover:border-[#3F3F46] rounded-xl p-4 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-4 rounded-full shrink-0 border border-white/20 shadow-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <span>{item.name}</span>
                                <span className="text-[10px] text-[#A1A1AA] font-normal">
                                  ({item.enName})
                                </span>
                              </h4>
                              <p className="text-[11px] text-[#A1A1AA] line-clamp-1">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-base font-bold text-[#D4AF37]">
                              {currentPct}%
                            </span>
                          </div>
                        </div>

                        {/* Slider & Adjust Buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleBakhoorAdjust(item.id, -5)}
                            disabled={currentPct === 0}
                            className="w-8 h-8 rounded-lg bg-[#27272A] hover:bg-[#333338] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer border border-[#3F3F46]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={currentPct}
                            onChange={(e) => handleBakhoorSlider(item.id, Number(e.target.value))}
                            className="flex-1 accent-[#D4AF37] cursor-pointer h-2 bg-[#27272A] rounded-lg"
                          />

                          <button
                            onClick={() => handleBakhoorAdjust(item.id, 5)}
                            disabled={currentPct >= 100}
                            className="w-8 h-8 rounded-lg bg-[#27272A] hover:bg-[#333338] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer border border-[#3F3F46]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* 2 Frankincense Items */
                  FRANKINCENSE_INGREDIENTS.map((item) => {
                    const currentPct = frankincensePercentages[item.id];
                    return (
                      <div
                        key={item.id}
                        className="bg-[#1F1F23] border border-[#2E2E33] hover:border-[#3F3F46] rounded-xl p-4 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-4 rounded-full shrink-0 border border-white/20 shadow-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <span>{item.name}</span>
                                <span className="text-[10px] text-[#A1A1AA] font-normal">
                                  ({item.enName})
                                </span>
                              </h4>
                              <p className="text-[11px] text-[#A1A1AA] line-clamp-1">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-base font-bold text-[#D4AF37]">
                              {currentPct}%
                            </span>
                          </div>
                        </div>

                        {/* Slider & Adjust Buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleFrankincenseAdjust(item.id, -5)}
                            disabled={currentPct === 0}
                            className="w-8 h-8 rounded-lg bg-[#27272A] hover:bg-[#333338] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer border border-[#3F3F46]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={currentPct}
                            onChange={(e) => handleFrankincenseSlider(item.id, Number(e.target.value))}
                            className="flex-1 accent-[#D4AF37] cursor-pointer h-2 bg-[#27272A] rounded-lg"
                          />

                          <button
                            onClick={() => handleFrankincenseAdjust(item.id, 5)}
                            disabled={currentPct >= 100}
                            className="w-8 h-8 rounded-lg bg-[#27272A] hover:bg-[#333338] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer border border-[#3F3F46]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add To Cart Bar */}
              <div className="pt-2 border-t border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-[#A1A1AA]">السعر الثابت للعلبة الكاملة:</div>
                  <div className="text-2xl font-black text-[#D4AF37] font-mono">
                    {formatIQD(FIXED_JAR_PRICE)}
                  </div>
                </div>

                <button
                  id="add-custom-blend-btn"
                  onClick={handleAddCustomMix}
                  disabled={!isComplete}
                  className={`w-full sm:w-auto px-7 py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                    isComplete
                      ? isBouncing
                        ? 'animate-btn-bounce bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#E6C875] text-[#121214] ring-4 ring-[#C5A059]/50 scale-105'
                        : 'bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#E6C875] hover:brightness-110 text-[#121214] shadow-[#C5A059]/30 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-[#27272A] text-[#71717A] border border-[#3F3F46] cursor-not-allowed opacity-60'
                  }`}
                >
                  <ShoppingBag className={`w-4 h-4 ${isBouncing ? 'animate-badge-pop' : ''}`} />
                  <span>
                    {isComplete
                      ? isBouncing
                        ? 'تمت إضافة الخلطة بنجاح! 🎉'
                        : `إضافة الخلطة للسلة بسعر ${formatIQD(FIXED_JAR_PRICE)}`
                      : `أكمل الخلطة إلى 100% للإضافة (${totalPercentage}%)`}
                  </span>
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Real Golden Jar & Mabkhara Showcase (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#18181B]/95 border border-[#27272A] rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center backdrop-blur-md">
              
              {/* Header Status in Card */}
              <div className="w-full flex items-center justify-between pb-4 mb-3 border-b border-[#27272A]">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>معاينة حية للعلبة والمبخرة</span>
                </span>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    isComplete
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {isComplete ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>القبق مغلق بإحكام</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>القبق مفتوح للتعبئة</span>
                    </>
                  )}
                </span>
              </div>

              {/* STAGE: Golden Jar & Mabkhara Side by Side */}
              <div className="w-full py-4 flex items-end justify-around gap-4 min-h-[320px] relative">
                
                {/* 1. REAL GOLDEN JAR COMPONENT */}
                <div className="flex flex-col items-center relative w-36">
                  
                  {/* Floating / Screwing Lid Layer */}
                  <motion.div
                    className="relative z-30 cursor-pointer w-28 h-18 -mb-3"
                    animate={
                      isComplete
                        ? { y: 6, rotate: 0, scale: 1 }
                        : {
                            y: -36,
                            rotate: -15,
                            scale: 1.08,
                            transition: { type: 'spring', stiffness: 200, damping: 14 },
                          }
                    }
                    transition={{ duration: 0.5 }}
                  >
                    <img
                      src={goldenJarLidImg}
                      alt="قبق العلبة الذهبية"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                    />
                  </motion.div>

                  {/* Golden Jar Body with Inner Filling Layers */}
                  <div className="w-32 h-40 relative rounded-2xl overflow-hidden border border-[#D4AF37]/60 shadow-[0_10px_30px_rgba(0,0,0,0.9)] bg-black/60 flex flex-col justify-end">
                    
                    {/* Realistic Golden Jar Body Image Overlay */}
                    <img
                      src={goldenJarBodyImg}
                      alt="جسم العلبة الذهبية"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-85 z-10 pointer-events-none"
                    />

                    {/* Golden Lattice Pattern Sheen */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/20 via-transparent to-transparent z-15 pointer-events-none" />

                    {/* Dynamic Filling Ingredients Layers */}
                    <div className="w-full flex flex-col justify-end h-full relative z-5 overflow-hidden">
                      {activeCategory === 'bakhoor' ? (
                        <>
                          {/* Sandalwood Layer */}
                          <motion.div
                            className="w-full transition-all duration-300 relative"
                            style={{
                              height: `${bakhoorPercentages.mabsous_sandal}%`,
                              backgroundColor: BAKHOOR_INGREDIENTS[2].color,
                            }}
                          >
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#FFE885_1px,transparent_1px)] [background-size:4px_4px]" />
                          </motion.div>

                          {/* Dust Oud Layer */}
                          <motion.div
                            className="w-full transition-all duration-300 relative"
                            style={{
                              height: `${bakhoorPercentages.mabsous_dust}%`,
                              backgroundColor: BAKHOOR_INGREDIENTS[1].color,
                            }}
                          >
                            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:3px_3px]" />
                          </motion.div>

                          {/* Mabsous Oud Layer */}
                          <motion.div
                            className="w-full transition-all duration-300 relative"
                            style={{
                              height: `${bakhoorPercentages.mabsous_oud}%`,
                              backgroundColor: BAKHOOR_INGREDIENTS[0].color,
                            }}
                          >
                            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:4px_4px]" />
                          </motion.div>
                        </>
                      ) : (
                        <>
                          {/* Rose Frankincense Layer */}
                          <motion.div
                            className="w-full transition-all duration-300 relative"
                            style={{
                              height: `${frankincensePercentages.luban_rose}%`,
                              backgroundColor: FRANKINCENSE_INGREDIENTS[1].color,
                            }}
                          >
                            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#FFE885_1px,transparent_1px)] [background-size:4px_4px]" />
                          </motion.div>

                          {/* Musky Frankincense Layer */}
                          <motion.div
                            className="w-full transition-all duration-300 relative"
                            style={{
                              height: `${frankincensePercentages.luban_musk}%`,
                              backgroundColor: FRANKINCENSE_INGREDIENTS[0].color,
                            }}
                          >
                            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:3px_3px]" />
                          </motion.div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Jar Subtitle */}
                  <span className="text-[11px] font-bold text-[#D4AF37] mt-2">
                    العلبة الذهبية الملكية
                  </span>
                </div>

                {/* 2. MABKHARA & REALISTIC SMOKE ANIMATION */}
                <div className="flex flex-col items-center relative w-36">
                  
                  {/* Rising Smoke Container */}
                  <div className="h-28 w-32 relative flex items-center justify-center overflow-visible">
                    <AnimatePresence>
                      {isComplete && (
                        <div className="absolute bottom-0 w-full flex justify-center pointer-events-none">
                          {/* Smoke Stream 1 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.3, y: 0, x: 0 }}
                            animate={{
                              opacity: [0, 0.8, 0.4, 0],
                              scale: [0.4, 1.3, 2.0, 2.7],
                              y: [-5, -45, -90, -140],
                              x: [0, -10, 8, -14],
                            }}
                            transition={{
                              duration: 3.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="w-10 h-10 rounded-full bg-gradient-to-t from-[#D4AF37]/35 via-white/25 to-transparent blur-md absolute"
                          />

                          {/* Smoke Stream 2 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.2, y: 0, x: 0 }}
                            animate={{
                              opacity: [0, 0.9, 0.5, 0],
                              scale: [0.3, 1.4, 2.2, 2.9],
                              y: [-8, -50, -95, -145],
                              x: [0, 12, -8, 16],
                            }}
                            transition={{
                              duration: 3.6,
                              repeat: Infinity,
                              delay: 0.9,
                              ease: 'easeInOut',
                            }}
                            className="w-11 h-11 rounded-full bg-gradient-to-t from-amber-100/35 via-white/30 to-transparent blur-md absolute"
                          />

                          {/* Smoke Stream 3 */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.2, y: 0, x: 0 }}
                            animate={{
                              opacity: [0, 0.95, 0.4, 0],
                              scale: [0.4, 1.2, 1.9, 2.4],
                              y: [-6, -42, -85, -130],
                              x: [0, -6, 10, -8],
                            }}
                            transition={{
                              duration: 2.9,
                              repeat: Infinity,
                              delay: 1.6,
                              ease: 'easeInOut',
                            }}
                            className="w-8 h-8 rounded-full bg-gradient-to-t from-[#FFE885]/45 via-white/25 to-transparent blur-sm absolute"
                          />
                        </div>
                      )}
                    </AnimatePresence>

                    {!isComplete && (
                      <span className="text-[10px] text-[#71717A] text-center max-w-[100px] leading-tight font-medium">
                        المبخرة بانتظار إغلاق العلبة (100%)...
                      </span>
                    )}
                  </div>

                  {/* Mabkhara Body Image */}
                  <div className="relative w-28 h-36 flex flex-col items-center">
                    
                    {/* Glowing Ember in Bowl */}
                    {isComplete && (
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 0.95, 1],
                          opacity: [0.85, 1, 0.9, 0.85],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute top-4 w-10 h-4 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 rounded-full blur-xs shadow-lg shadow-amber-500/60 z-20"
                      />
                    )}

                    <img
                      src={mabkharaImg}
                      alt="المبخرة الملكية"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]"
                    />
                  </div>

                  {/* Mabkhara Subtitle */}
                  <span className="text-[11px] font-bold text-[#D4AF37] mt-2 flex items-center gap-1">
                    <Flame className={`w-3 h-3 ${isComplete ? 'text-amber-400' : 'text-[#71717A]'}`} />
                    <span>المبخرة الملكية</span>
                  </span>
                </div>

              </div>

              {/* LIVE BLEND STATS */}
              <div className="w-full mt-4 bg-[#1F1F23] border border-[#2E2E33] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2E2E33]">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>معلومات الخلطة الحية:</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#D4AF37] font-bold">
                    {totalPercentage}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA] text-[11px]">درجة الفوحان:</span>
                    <div className="font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>{blendStats.diffusionRate}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#A1A1AA] text-[11px]">ثبات العطر والفوحان:</span>
                    <div className="font-bold text-[#FFE58F] font-mono text-xs sm:text-sm">
                      {blendStats.longevity}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2E2E33] space-y-1">
                  <span className="text-[#A1A1AA] text-[11px]">الطابع العطري:</span>
                  <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                    {blendStats.scentProfile}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
