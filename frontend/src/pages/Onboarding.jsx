import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import { Activity, BellRing, ShieldAlert } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

const slides = [
  {
    id: 1,
    title: 'Fast Emergency Response',
    description: 'Get immediate help with a single tap during critical health emergencies.',
    icon: <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />,
    color: 'bg-red-50',
  },
  {
    id: 2,
    title: 'Track Vitals',
    description: 'Monitor your health metrics continuously to stay ahead of potential issues.',
    icon: <Activity className="w-24 h-24 text-blue-500 mb-6" />,
    color: 'bg-blue-50',
  },
  {
    id: 3,
    title: 'Notify Loved Ones',
    description: 'Automatically alert your emergency contacts when you need them most.',
    icon: <BellRing className="w-24 h-24 text-emerald-500 mb-6" />,
    color: 'bg-emerald-50',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white relative">
      {/* Top 70% Slider area */}
      <div className="h-[70%] w-full">
        <Swiper
          modules={[Pagination, Autoplay]}
          pagination={{ clickable: true, dynamicBullets: true }}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          loop={true}
          className="w-full h-full"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div className={`w-full h-full flex flex-col items-center justify-center px-8 text-center ${slide.color}`}>
                <div className="flex-1 flex flex-col items-center justify-center mt-12">
                  {slide.icon}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{slide.title}</h1>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-sm">
                    {slide.description}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Bottom 30% Fixed Action area */}
      <div className="h-[30%] w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] absolute bottom-0 z-10 flex flex-col items-center justify-center px-6 gap-4 pb-8">
        <button
          onClick={() => navigate('/register')}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
        >
          Sign Up
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-4 rounded-2xl bg-indigo-50 text-indigo-600 font-semibold text-lg hover:bg-indigo-100 active:scale-95 transition-all"
        >
          Log In
        </button>
      </div>
      
      {/* Global CSS override for swiper pagination dots to match branding */}
      <style>{`
        .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background-color: #cbd5e1;
          opacity: 1;
        }
        .swiper-pagination-bullet-active {
          background-color: #4f46e5;
          width: 24px;
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
}
