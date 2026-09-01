import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CustomerLocation } from '../types';
import { MapPin, LocateFixed, Check, X, AlertCircle } from 'lucide-react';

interface InteractiveMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    location: CustomerLocation,
    backupDetails: { district: string; nearestLandmark: string; houseDetails: string }
  ) => void;
  initialLocation?: CustomerLocation | null;
  initialBackup?: { district: string; nearestLandmark: string; houseDetails: string };
}

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLocation,
  initialBackup,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Default to Basra center if no initial location
  const defaultLat = initialLocation?.latitude || 30.5081;
  const defaultLng = initialLocation?.longitude || 47.7835;

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [accuracy, setAccuracy] = useState<number | undefined>(initialLocation?.accuracy);
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');

  // Backup mandatory fields
  const [district, setDistrict] = useState<string>(initialBackup?.district || '');
  const [nearestLandmark, setNearestLandmark] = useState<string>(initialBackup?.nearestLandmark || '');
  const [houseDetails, setHouseDetails] = useState<string>(initialBackup?.houseDetails || '');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [defaultLat, defaultLng],
          zoom: 16,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `<div style="background-color: #C5A059; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; color: white;">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        const marker = L.marker([defaultLat, defaultLng], {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setLat(parseFloat(pos.lat.toFixed(6)));
          setLng(parseFloat(pos.lng.toFixed(6)));
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          setLat(parseFloat(e.latlng.lat.toFixed(6)));
          setLng(parseFloat(e.latlng.lng.toFixed(6)));
        });

        markerRef.current = marker;
        mapRef.current = map;
      } else {
        mapRef.current.setView([defaultLat, defaultLng], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([defaultLat, defaultLng]);
        }
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, defaultLat, defaultLng]);

  const handleGetHighAccuracyGps = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم تحديد الموقع الجغرافي");
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = Math.round(position.coords.accuracy);

        setLat(parseFloat(lat.toFixed(6)));
        setLng(parseFloat(lng.toFixed(6)));
        setAccuracy(acc);
        setIsGettingGps(false);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.flyTo([lat, lng], 18);
        }
      },
      (error) => {
        setIsGettingGps(false);
        console.warn('High accuracy GPS error:', error);
        alert("تعذر تحديد الموقع الفعلي: يُرجى تفعيل الـ GPS وإعطاء إذن الموقع للمتصفح.");
        setGpsError('تعذر تحديد الموقع الفعلي: يُرجى تفعيل الـ GPS وإعطاء إذن الموقع للمتصفح.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleConfirmLocation = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setValidationError('');
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const locationObj: CustomerLocation = {
      latitude: lat,
      longitude: lng,
      accuracy: accuracy || 5,
      mapUrl,
      isPinnedManually: true,
      district: district.trim() || 'البصرة',
      nearestLandmark: nearestLandmark.trim() || 'موقع GPS محدد على الخريطة',
    };

    onConfirm(locationObj, { 
      district: district.trim(), 
      nearestLandmark: nearestLandmark.trim(), 
      houseDetails: houseDetails.trim() 
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
    >
      <div 
        className="bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#EAEAEA] dark:border-[#27272A] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#EAEAEA] dark:border-[#27272A] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#18181C]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A] dark:text-white text-sm sm:text-base">تحديد موقع التوصيل بدقة فائقة</h3>
              <p className="text-[11px] text-[#666666] dark:text-[#A1A1AA]">اسحب الدبوس فوق سطح بيتك تماماً لضمان وصول المندوب بلا تأخير</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white dark:bg-[#202026] border border-[#EAEAEA] dark:border-[#2E2E35] text-[#666666] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between bg-[#FAFAFA] dark:bg-[#18181C] p-3 rounded-xl border border-[#EAEAEA] dark:border-[#27272A]">
            <div>
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-white block">إحداثيات الدبوس الحالي:</span>
              <span className="text-[11px] font-mono text-[#C5A059] dark:text-[#FFE58F]" dir="ltr">
                Lat: {lat}, Lng: {lng} {accuracy ? `(دقة: ±${accuracy}م)` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={handleGetHighAccuracyGps}
              disabled={isGettingGps}
              className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
              <span>{isGettingGps ? 'جاري التقاط GPS...' : 'تحديد موقعي الحالي GPS'}</span>
            </button>
          </div>

          {gpsError && (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{gpsError}</span>
            </p>
          )}

          <div className="relative w-full h-[280px] sm:h-[320px] rounded-xl border border-[#EAEAEA] dark:border-[#27272A] overflow-hidden shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full z-10" />
            <div className="absolute bottom-2 left-2 z-20 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#EAEAEA] dark:border-[#2E2E35] text-[11px] text-[#666666] dark:text-[#A1A1AA] shadow-sm pointer-events-none">
              💡 نصيحة: قم بتكبير الخريطة واسحب الدبوس نحو منزلك بدقة
            </div>
          </div>

          <div className="bg-[#FAFAFA] dark:bg-[#18181C] p-4 rounded-xl border border-[#EAEAEA] dark:border-[#27272A] space-y-3">
            <h4 className="font-bold text-xs text-[#1A1A1A] dark:text-white flex items-center gap-1.5 border-b border-[#EAEAEA] dark:border-[#27272A] pb-2">
              <span>📝 تفاصيل عنوان إضافية (اختياري):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#666666] dark:text-[#A1A1AA] font-medium mb-1">
                  المحافظة / المنطقة (اختياري):
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="مثلاً: البصرة - التميمية / حي الحسين"
                  className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3 py-2 text-xs outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#666666] dark:text-[#A1A1AA] font-medium mb-1">
                  أقرب نقطة دالة (اختياري):
                </label>
                <input
                  type="text"
                  value={nearestLandmark}
                  onChange={(e) => setNearestLandmark(e.target.value)}
                  placeholder="مثلاً: قرب مستشفى نفط البصرة"
                  className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3 py-2 text-xs outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#666666] dark:text-[#A1A1AA] font-medium mb-1">
                  رقم البيت أو تفاصيل إضافية (اختياري):
                </label>
                <input
                  type="text"
                  value={houseDetails}
                  onChange={(e) => setHouseDetails(e.target.value)}
                  placeholder="مثلاً: دار رقم 14، زقاق 5"
                  className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3 py-2 text-xs outline-hidden"
                />
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#EAEAEA] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#18181C] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="px-4 py-2 rounded-lg border border-[#EAEAEA] dark:border-[#2E2E35] text-[#666666] dark:text-[#A1A1AA] hover:bg-white dark:hover:bg-[#202026] text-xs font-semibold transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmLocation(e); }}
            className="bg-[#C5A059] hover:bg-[#B38F4D] text-white text-xs font-bold px-6 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد الموقع وتثبيت الدبوس</span>
          </button>
        </div>
      </div>
    </div>
  );
};
