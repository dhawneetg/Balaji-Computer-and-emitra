'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import type { ExamData } from '@/app/api/exams/route';

interface WhatsAppShareButtonProps {
  exam: ExamData;
}

export default function WhatsAppShareButton({ exam }: WhatsAppShareButtonProps) {
  const handleShare = () => {
    const phoneNumber = window.prompt("Enter Customer's WhatsApp Number (with country code, e.g., 919876543210):");
    
    if (phoneNumber) {
      const message = `Hello! Here are the details for *${exam.name}*:
      
*Vacancies*: ${exam.vacancy}
*Fee*: ${exam.fees}
*Last Date*: ${new Date(exam.endDate).toLocaleDateString()}

Apply at *Balaji Computer and e-Mitra*!`;

      const encodedMessage = encodeURIComponent(message);
      // Clean up phone number (remove spaces, +, -, etc)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
      title="Share via WhatsApp"
    >
      <Share2 className="w-5 h-5 mr-2" />
      Share
    </button>
  );
}
