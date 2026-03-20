import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, Sparkles, Navigation, ChevronRight } from 'lucide-react';

export default function VisitScreen() {
  const address = "2nd floor, Ramanashree Chambers, 37, Lady Curzon Rd, Tasker Town, Shivaji Nagar, Bengaluru, Karnataka 560001, India";
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const serviceTimings = [
    { day: "Sunday Morning", time: "10:15 AM - 12:30 PM" },
    { day: "Wednesday Mid-week", time: "8:00 PM - 8:30 PM" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto px-4 py-12 space-y-12"
    >
      {/* Header */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage/30 rounded-full text-sage font-medium text-sm tracking-widest uppercase">
          <Sparkles className="w-4 h-4" />
          Visit Us
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-deep-blue">Join Our Community</h1>
        <p className="text-gray-600 font-light max-w-xl mx-auto">
          We welcome you to experience the warmth and grace of our sanctuary. Find our location and service times below.
        </p>
      </section>

      {/* Address & Timings Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Address Box */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-beige-warm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-3 bg-blush w-fit rounded-2xl">
              <MapPin className="text-gold w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-deep-blue">Our Location</h2>
            <p className="text-gray-600 leading-relaxed font-serif text-lg italic">
              {address}
            </p>
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-beige-light rounded-2xl text-deep-blue font-medium hover:bg-beige-warm transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-gold group-hover:rotate-12 transition-transform" />
              Open in Maps
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </a>
        </section>

        {/* Timings Box */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-beige-warm space-y-6">
          <div className="p-3 bg-sage w-fit rounded-2xl">
            <Clock className="text-deep-blue w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-deep-blue">Service Timings</h2>
          <div className="space-y-4">
            {serviceTimings.map((timing, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-beige-warm last:border-0">
                <span className="text-gray-500 font-medium">{timing.day}</span>
                <span className="text-deep-blue font-serif italic">{timing.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Hero Image / Map Trigger */}
      <section className="relative h-[400px] rounded-[40px] overflow-hidden shadow-2xl group">
        {/* Background Image - Sunrise (Non-cross) */}
        <img
          src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=1200"
          alt="Sunrise over a peaceful landscape"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-deep-blue/60 via-transparent to-transparent" />
        
        {/* Interactive Overlay Box */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.open(googleMapsUrl, '_blank')}
            className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50 text-center space-y-4 max-w-sm group/btn"
          >
            <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto group-hover/btn:bg-gold/30 transition-colors">
              <MapPin className="text-gold w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-deep-blue">Find Your Way</h3>
            <p className="text-gray-600 text-sm">
              Tap here to get directions to our sanctuary in Bengaluru.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 text-gold font-bold text-sm uppercase tracking-widest">
                Get Directions <Navigation className="w-4 h-4" />
              </span>
            </div>
          </motion.button>
        </div>

        {/* Subtle Sparkles */}
        <div className="absolute top-8 right-8">
          <Sparkles className="text-white/50 w-12 h-12 animate-pulse" />
        </div>
      </section>
    </motion.div>
  );
}
