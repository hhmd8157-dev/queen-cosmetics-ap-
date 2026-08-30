import React from 'react';
import { Crown, Sparkles, MessageCircle, Truck, ShieldCheck, Clock, ArrowLeft, Star } from 'lucide-react';
import { STORE_INFO } from '../data/products';

interface HeroBannerProps {
  onExploreClick: () => void;
  onCustomBakhoorClick?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick, onCustomBakhoorClick }) => {
  const handleBakhoorClick = () => {
    if (onCustomBakhoorClick) {
      onCustomBakhoorClick();
    } else {
      document.getElementById('custom-bakhoor-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#FFFFFF] border-b border-[#EAEAEA] text-[#1A1A1A] py-10 md:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Copy Area */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 bg-[#FAFAFA] border border-[#EAEAEA] text-[#C5A059] px-3.5 py-1 rounded-full text-xs font-semibold">
              <Crown className="w-4 h-4 text-[#C5A059]" />
              <span>المتجر الملكي للعناية والتجميل في العراق</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight sm:leading-snug font-serif text-[#1A1A1A]">
              تألق بجمال ملكي مع <br />
              <span className="text-[#C5A059]">
                كوزمتك الملكة
              </span>
            </h1>

            <p className="text-[#666666] text-sm sm:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              وجهتك الموثوقة لأفضل منتجات العناية بالبشرة والشعر، اللوشنات الفاخرة، والعطور والبخور الأصلية من قلب البصرة مع خدمة الطلب الفوري والتوصيل السريع لمركز وأقضية البصرة وكافة المحافظات.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                id="hero-custom-bakhoor-btn"
                onClick={handleBakhoorClick}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-[#121214] px-6 py-3 rounded-lg font-bold text-xs sm:text-sm shadow-md shadow-[#C5A059]/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>اصنع خلطة بخورك الخاصة</span>
              </button>

              <a
                id="hero-whatsapp-order-btn"
                href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent('مرحباً كوزمتك الملكة، أود الاستفسار والطلب من التشكيلة المتوفرة')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-3 rounded-lg font-semibold text-xs sm:text-sm shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>طلب بالواتساب</span>
              </a>

              <button
                id="hero-browse-products-btn"
                onClick={onExploreClick}
                className="flex items-center justify-center gap-2 bg-[#FAFAFA] hover:bg-[#F0F0F0] text-[#1A1A1A] border border-[#EAEAEA] px-5 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <span>استكشف المنتجات</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Quick customer trust metric */}
            <div className="pt-2 flex items-center justify-center lg:justify-start gap-3 text-xs text-[#999999]">
              <div className="flex items-center gap-1 text-[#C5A059]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#C5A059] text-[#C5A059]" />
                ))}
              </div>
              <span>تقييم 5.0 من أكثر من 1,500+ زبون في العراق</span>
            </div>
          </div>

          {/* Feature Badges Cards Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
            
            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-4 text-right space-y-1.5 hover:border-[#C5A059]/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAEA] text-[#C5A059] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-[#1A1A1A]">منتجات أصلية 100%</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                مستوردة مباشرة من الوكلاء ومضمونة الجودة.
              </p>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-4 text-right space-y-1.5 hover:border-[#C5A059]/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAEA] text-[#C5A059] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-[#1A1A1A]">توصيل سريع</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                لبغداد والمحافظات العراقية بأجور رمزية.
              </p>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-4 text-right space-y-1.5 hover:border-[#C5A059]/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAEA] text-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-[#1A1A1A]">طلب مباشر فوري</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                متابعة حصرية لشحنتكِ بالواتساب.
              </p>
            </div>

            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-4 text-right space-y-1.5 hover:border-[#C5A059]/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAEA] text-[#C5A059] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-[#1A1A1A]">الدفع عند الاستلام</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                افحصي طلبيتكِ وادفعي بالدينار العراقي.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
