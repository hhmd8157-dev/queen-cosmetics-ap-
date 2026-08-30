import React from 'react';
import { ShieldCheck, Truck, MessageCircle, Sparkles, RefreshCw, Award } from 'lucide-react';
import { STORE_INFO, formatIQD } from '../data/products';

export const TrustSection: React.FC = () => {
  return (
    <section className="bg-white py-12 border-y border-[#EAEAEA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">
            لماذا كوزمتك الملكة؟
          </h2>
          <p className="text-xs sm:text-sm text-[#666666]">
            موقعنا في البصرة — نوفر لك أفضل المنتجات العالمية الأصلية مع خدمة عملاء استثنائية وسرعة في التوصيل لمركز وأقضية البصرة وكافة المحافظات
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#FAFAFA] p-5 rounded-xl border border-[#EAEAEA] text-center space-y-2.5">
            <div className="w-10 h-10 bg-white border border-[#EAEAEA] text-[#C5A059] rounded-lg flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-sm">منتجات أصلية 100%</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              جميع العطور، السيرومات، واللوشنات أصلية ومستوردة من بلد المنشأ مع ضمان الجودة الكامل.
            </p>
          </div>

          <div className="bg-[#FAFAFA] p-5 rounded-xl border border-[#EAEAEA] text-center space-y-2.5">
            <div className="w-10 h-10 bg-white border border-[#EAEAEA] text-[#C5A059] rounded-lg flex items-center justify-center mx-auto">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-sm">شحن وتوصيل فوري</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              مركز البصرة: <strong>3,000 د.ع</strong> فقط | أقضية البصرة وباقي المحافظات: <strong>5,000 د.ع</strong> بتغليف آمن وسريع.
            </p>
          </div>

          <div className="bg-[#FAFAFA] p-5 rounded-xl border border-[#EAEAEA] text-center space-y-2.5">
            <div className="w-10 h-10 bg-white border border-[#EAEAEA] text-[#25D366] rounded-lg flex items-center justify-center mx-auto">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-sm">طلب مباشر بالواتساب</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              بضغطة زر واحدة يتم تحويل طلبك برسالة منسقة إلى هاتف المتجر <strong className="text-[#1A1A1A]">{STORE_INFO.displayPhone}</strong> لتأكيده فوراً.
            </p>
          </div>

          <div className="bg-[#FAFAFA] p-5 rounded-xl border border-[#EAEAEA] text-center space-y-2.5">
            <div className="w-10 h-10 bg-white border border-[#EAEAEA] text-[#C5A059] rounded-lg flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-sm">دفع عند الاستلام</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              افحص شحنتك وتأكد من سلامة المنتجات قبل الدفع لمندوب التوصيل بالدينار العراقي.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
