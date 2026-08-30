import React from 'react';
import { Crown, MessageCircle, Phone, MapPin, Clock, Heart, Sparkles, Instagram, Bike, ShieldCheck } from 'lucide-react';
import { STORE_INFO } from '../data/products';
import { CategoryId } from '../types';

interface FooterProps {
  onSelectCategory: (cat: CategoryId) => void;
  onOpenTracker?: () => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onOpenTracker, onOpenAdmin }) => {
  return (
    <footer className="bg-[#1A1A1A] text-[#999999] pt-14 pb-10 border-t border-[#333333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-[#2E2E2E]">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2E2E2E] flex items-center justify-center text-[#C5A059]">
                <Crown className="w-4 h-4 text-[#C5A059]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">{STORE_INFO.name}</h3>
                <p className="text-[10px] text-[#C5A059] font-medium tracking-wider">
                  {STORE_INFO.enName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#888888] leading-relaxed">
              المتجر المتخصص بالأناقة والجمال في العراق. نوفر تشكيلة مختارة بعناية من العطور الفاخرة، البخور المروكي، اللوشنات، ومنتجات العناية بالبشرة والشعر مع نظام طلب وتتبع مباشر.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://wa.me/${STORE_INFO.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#2E2E2E] hover:bg-[#25D366] text-[#999999] hover:text-white flex items-center justify-center transition-colors"
                title="تواصل عبر الواتساب"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#2E2E2E] hover:bg-[#333333] text-[#999999] hover:text-white flex items-center justify-center transition-colors"
                title="إنستغرام"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Categories & Live Tracking */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs tracking-wider">خدمات وتتبع الطلبات</h4>
            <ul className="space-y-2 text-xs text-[#888888]">
              {onOpenTracker && (
                <li>
                  <button
                    onClick={onOpenTracker}
                    className="text-[#FFE58F] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
                  >
                    <Bike className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>تتبع الشحنة المباشر 🛵</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('bestsellers');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  🔥 الأكثر مبيعاً
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('offers');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  🏷️ الخصومات والعروض
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('bakhoor');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  🪵 قسم البخور
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('mixtures');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  ✨ قسم الخلطات
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('skincare');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  🧴 قسم العناية بالبشرة
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('body_sprays_deo');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  🌸 معطرات الجسم ومزيلات العرق
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('perfumes');
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  👑 قسم العطور
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    document.getElementById('custom-bakhoor-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[#C5A059] hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>اصنع خلطة بخورك الخاصة</span>
                </button>
              </li>
              {onOpenAdmin && (
                <li className="pt-1.5 border-t border-[#2A2A2A]">
                  <button
                    onClick={onOpenAdmin}
                    className="text-[#FFE58F] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>لوحة تحكم الإدارة 👑</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-xs tracking-wider">معلومات التواصل والتوصيل</h4>
            <ul className="space-y-2.5 text-xs text-[#888888]">
              <li className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#CCCCCC] font-medium text-[11px]">الهاتف والواتساب:</span>
                  <a
                    href={`https://wa.me/${STORE_INFO.whatsappNumber}`}
                    className="text-[#25D366] hover:underline font-mono text-xs"
                    dir="ltr"
                  >
                    {STORE_INFO.displayPhone}
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#CCCCCC] font-medium text-[11px]">الموقع والتوصيل:</span>
                  <span>{STORE_INFO.address}</span>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#CCCCCC] font-medium text-[11px]">ساعات العمل:</span>
                  <span>{STORE_INFO.workingHours}</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Direct WhatsApp Callout Box */}
          <div className="bg-[#242424] p-4 rounded-xl border border-[#333333] space-y-2.5 text-right">
            <div className="w-8 h-8 rounded-lg bg-[#2E2E2E] text-[#25D366] flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-white text-xs">استشارة فورية</h4>
            <p className="text-[11px] text-[#888888] leading-relaxed">
              فريقنا متاح لمساعدتك في اختيار المنتجات المناسبة لنوع بشرتك وشعرك عبر الواتساب.
            </p>
            <a
              href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent('مرحباً كوزمتك الملكة، أود استشارة حول المنتجات')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
            >
              <span>مراسلة عبر الواتساب</span>
            </a>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#666666]">
          <p>© {new Date().getFullYear()} {STORE_INFO.name} ({STORE_INFO.enName}). جميع الحقوق محفوظة.</p>
          
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#888888] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>دفع آمن عند الاستلام وتوصيل معتمد</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
