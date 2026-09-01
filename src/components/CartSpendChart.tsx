import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { CartItem } from '../types';
import { formatIQD } from '../data/products';
import { ShoppingBag, TrendingUp, Sparkles } from 'lucide-react';

interface CartSpendChartProps {
  cartItems: CartItem[];
}

interface CategorySpend {
  category: string;
  label: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'skincare': '#529E72', // Emerald Sage
  'عناية': '#529E72',
  'perfumes': '#C5A059', // Royal Gold
  'عطور': '#C5A059',
  'haircare': '#4A90E2', // Sky Blue
  'شعر': '#4A90E2',
  'bakhoor': '#8C6B2D',  // Bronze/Amber
  'mixtures': '#E06D53',  // Coral Mixture
  'body_sprays_deo': '#D27B7B', // Soft Rose
  'offers': '#FF4D4F', // Vivid Offer Red
  'default': '#8E8E93' // Soft Gray
};

const getCategoryLabel = (cat: string): string => {
  const clean = cat.toLowerCase().trim();
  if (clean === 'skincare' || clean === 'عناية') return 'عناية بالبشرة';
  if (clean === 'perfumes' || clean === 'عطور') return 'عطور ومعطرات';
  if (clean === 'haircare' || clean === 'شعر') return 'عناية بالشعر';
  if (clean === 'bakhoor') return 'بخور ومعمول';
  if (clean === 'mixtures') return 'خلطات ملكية';
  if (clean === 'body_sprays_deo') return 'معطرات الجسم';
  if (clean === 'offers') return 'العروض المتميزة';
  
  // Return the original with capitalized first letter if it's English
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

export const CartSpendChart: React.FC<CartSpendChartProps> = ({ cartItems }) => {
  // Aggregate spending by category
  const spendData = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return [];

    const aggregation: Record<string, number> = {};
    cartItems.forEach((item) => {
      const cat = item.product.category || 'default';
      const itemCost = item.product.price * item.quantity;
      aggregation[cat] = (aggregation[cat] || 0) + itemCost;
    });

    const categoriesArray: CategorySpend[] = Object.keys(aggregation).map((cat) => {
      const label = getCategoryLabel(cat);
      const value = aggregation[cat];
      const color = CATEGORY_COLORS[cat.toLowerCase().trim()] || CATEGORY_COLORS[cat] || CATEGORY_COLORS['default'];
      return {
        category: cat,
        label,
        value,
        color
      };
    });

    // Sort by value descending
    return categoriesArray.sort((a, b) => b.value - a.value);
  }, [cartItems]);

  const totalSpend = useMemo(() => {
    return spendData.reduce((acc, d) => acc + d.value, 0);
  }, [spendData]);

  // Generate Pie path descriptors using D3 math utilities
  const arcs = useMemo(() => {
    if (spendData.length === 0) return [];

    const pieGenerator = d3.pie<CategorySpend>()
      .value((d) => d.value)
      .sort(null); // Keep the pre-sorted array order

    const arcGenerator = d3.arc<d3.PieArcDatum<CategorySpend>>()
      .innerRadius(55)
      .outerRadius(90)
      .cornerRadius(4)
      .padAngle(0.03);

    const pieData = pieGenerator(spendData);
    
    return pieData.map((d) => {
      const path = arcGenerator(d) || '';
      const centroid = arcGenerator.centroid(d);
      return {
        data: d.data,
        path,
        centroid,
        percentage: ((d.data.value / totalSpend) * 100).toFixed(1)
      };
    });
  }, [spendData, totalSpend]);

  if (cartItems.length === 0) return null;

  return (
    <div id="cart-spend-chart-container" className="bg-[#FCFCFC] dark:bg-[#1A1A20] p-4 rounded-xl border border-[#EAEAEA] dark:border-[#27272A] space-y-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-[#27272A] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#1A1A1A] dark:text-white">
              تحليل وتوزيع ميزانية المشتريات 📊
            </h4>
            <p className="text-[10px] text-[#888888]">توزيع إنفاق السلة حسب فئات المنتجات</p>
          </div>
        </div>
        <span className="text-[10px] text-[#C5A059] font-bold bg-[#C5A059]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#C5A059]/20">
          <Sparkles className="w-3 h-3 text-[#C5A059]" />
          تحليل فوري D3
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8">
        {/* SVG Drawing Zone */}
        <div className="relative w-[185px] h-[185px] shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            <g transform="translate(100, 100)">
              {arcs.map((arc, index) => (
                <g key={index} className="group/slice cursor-pointer">
                  <path
                    d={arc.path}
                    fill={arc.data.color}
                    className="transition-all duration-300 hover:scale-102 hover:opacity-90"
                    style={{ transformOrigin: '0 0' }}
                  >
                    <title>{`${arc.data.label}: ${formatIQD(arc.data.value)} (${arc.percentage}%)`}</title>
                  </path>
                </g>
              ))}

              {/* Central Premium Donut Cut-out Label */}
              <circle r="48" fill="var(--color-bg, white)" className="fill-white dark:fill-[#141418] stroke-[#EAEAEA] dark:stroke-[#27272A] stroke-1" />
            </g>
          </svg>

          {/* Centered Absolute React Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span className="text-[9px] text-[#888888] font-bold uppercase tracking-wider">مجموع السلة</span>
            <span className="text-xs font-black text-[#1A1A1A] dark:text-white mt-0.5">{formatIQD(totalSpend)}</span>
            <div className="flex items-center gap-0.5 mt-0.5 text-[#C5A059]">
              <ShoppingBag className="w-3 h-3" />
              <span className="text-[10px] font-bold">{cartItems.reduce((acc, i) => acc + i.quantity, 0)} قطع</span>
            </div>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="flex-1 w-full space-y-2">
          <p className="text-[10px] font-extrabold text-[#666666] dark:text-[#A1A1AA] text-right">
            دليل فئات الإنفاق:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {arcs.map((arc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-[#141418] rounded-lg border border-[#EAEAEA] dark:border-[#27272A] shadow-3xs hover:border-[#C5A059]/30 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: arc.data.color }}
                  />
                  <span className="font-bold text-[#1A1A1A] dark:text-[#F4F4F5]">{arc.data.label}</span>
                </div>
                
                <div className="text-right flex items-center gap-2">
                  <span className="text-[#888888] font-medium">({arc.percentage}%)</span>
                  <span className="font-black text-[#1A1A1A] dark:text-white text-xs">{formatIQD(arc.data.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
