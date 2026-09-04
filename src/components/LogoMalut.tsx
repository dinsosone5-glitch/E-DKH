import React, { useState, useEffect } from 'react';
import { getSavedLogoDataUrl, saveLogoDataUrl } from '../services/driveAssetService';

export const LogoMalut: React.FC<{ className?: string; alt?: string }> = ({
  className = "w-14 h-16",
  alt = "Lambang Provinsi Maluku Utara"
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => getSavedLogoDataUrl());

  useEffect(() => {
    // Listen to storage updates if logo is synced from Drive
    const handleStorageChange = () => {
      setLogoUrl(getSavedLogoDataUrl());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('edkh_logo_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('edkh_logo_updated', handleStorageChange);
    };
  }, []);

  // If customized logo from Drive ASSET folder is available, render it cleanly
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={alt}
        className={`${className} object-contain`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Official Vector Lambang Provinsi Maluku Utara (High precision fallback)
  return (
    <svg viewBox="0 0 300 360" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer red shield boundary */}
      <path
        d="M 150 15 
           C 200 15, 270 45, 285 85 
           C 300 130, 275 220, 250 270 
           C 220 330, 150 355, 150 355 
           C 150 355, 80 330, 50 270 
           C 25 220, 0 130, 15 85 
           C 30 45, 100 15, 150 15 Z"
        fill="#dc2626"
        stroke="#b91c1c"
        strokeWidth="3"
      />
      {/* Inner Green Shield */}
      <path
        d="M 150 25 
           C 195 25, 255 52, 270 90 
           C 285 130, 260 215, 238 260 
           C 210 318, 150 342, 150 342 
           C 150 342, 90 318, 62 260 
           C 40 215, 15 130, 30 90 
           C 45 52, 105 25, 150 25 Z"
        fill="#15803d"
      />
      
      {/* Star at the top */}
      <polygon
        points="150,42 155,56 170,56 158,66 162,80 150,71 138,80 142,66 130,56 145,56"
        fill="#facc15"
      />

      {/* Central oval blue horizon & sea */}
      <ellipse cx="150" cy="180" rx="90" ry="85" fill="#0284c7" />
      <path d="M 60 180 Q 150 160 240 180 L 240 230 L 60 230 Z" fill="#1e3a8a" />
      {/* Mountain peak (Gunung Gamalama / Kie Matubu) */}
      <polygon points="150,115 195,180 105,180" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
      <polygon points="150,115 168,140 132,140" fill="#ffffff" />
      
      {/* Golden Wings / Untaian Padi & Kapas */}
      <path
        d="M 70 240 C 60 180, 70 120, 110 80 C 100 110, 100 170, 120 220 Z"
        fill="#eab308"
      />
      <path
        d="M 230 240 C 240 180, 230 120, 190 80 C 200 110, 200 170, 180 220 Z"
        fill="#eab308"
      />

      {/* Traditional Shield & Parang / Salawaku */}
      <rect x="135" y="195" width="30" height="42" rx="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />
      <circle cx="150" cy="185" r="14" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
      <circle cx="150" cy="185" r="6" fill="#ffffff" />
      <line x1="120" y1="225" x2="180" y2="205" stroke="#18181b" strokeWidth="5" strokeLinecap="round" />
      <line x1="120" y1="205" x2="180" y2="225" stroke="#18181b" strokeWidth="5" strokeLinecap="round" />

      {/* Pita Putih */}
      <path
        d="M 75 255 Q 150 280 225 255 Q 210 278 150 285 Q 90 278 75 255 Z"
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export const HeaderKopDinas: React.FC = () => {
  return (
    <div className="flex items-center gap-4 border-b-2 border-green-800 pb-3 mb-4">
      <LogoMalut className="w-16 h-20 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-gray-800 uppercase">
          PEMERINTAH PROVINSI MALUKU UTARA
        </h3>
        <h1 className="text-lg sm:text-2xl font-black text-green-900 tracking-tight">
          DINAS SOSIAL
        </h1>
        <p className="text-[10px] sm:text-xs text-gray-600 font-medium leading-tight">
          Jl. Lintas Halmahera Gosale Puncak No. 1, Kel. Guraping, Kec. Oba Utara, Kota Tidore Kepulauan
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 font-mono">
          Email: dinsos.prov.malukuutara@gmail.com / dinsosone5@gmail.com
        </p>
      </div>
    </div>
  );
};
