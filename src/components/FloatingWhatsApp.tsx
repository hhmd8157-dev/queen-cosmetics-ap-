import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { STORE_INFO } from '../data/products';

export const FloatingWhatsApp: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState<boolean>(true);

  return (
    <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5">
      {/* Friendly greeting bubble */}
      {showTooltip && (
        <div className="hidden sm:flex items-center gap-2 bg-white text-[#1A1A1A] px-3 py-1.5 rounded-lg shadow-lg border border-[#EAEAEA] text-xs font-medium">
          <span>متواجدون للمساعدة والطلب عبر الواتساب</span>
          <button
            onClick={() => setShowTooltip(false)}
            className="text-[#999999] hover:text-[#1A1A1A] mr-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating WhatsApp button */}
      <a
        id="floating-whatsapp-btn"
        href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent('مرحباً كوزمتك الملكة، أود الاستفسار والطلب')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer relative animate-gold-pulse"
        title="تواصل معنا عبر الواتساب"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </a>
    </div>
  );
};
