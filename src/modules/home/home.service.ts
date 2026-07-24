import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsultationService } from '../consultation/consultation.service';
import { ComboOfferService } from '../combo-offer/combo-offer.service';
import { PaymentService } from '../payment/payment.service';

const STATS = [
  { label: 'Years Experience', value: '10+' },
  { label: 'Happy Clients', value: '5,000+' },
  { label: 'Consultations Completed', value: '8,000+' },
  { label: 'Average Rating', value: '4.9★' },
];

const WHY_CHOOSE_US = [
  'Personalized Kundli Analysis',
  'Accurate Predictions',
  'Confidential Consultation',
  'Years of Practical Experience',
  'Post Consultation Guidance',
  'Quick Response',
  'Easy Online Booking',
];

const HOW_IT_WORKS = [
  { step: 1, title: 'Choose Consultation' },
  { step: 2, title: 'Select Date & Time' },
  { step: 3, title: 'Pay Online' },
  { step: 4, title: 'Receive Consultation' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    rating: 5,
    review:
      'Extremely accurate predictions about my career change. Highly recommend!',
    location: 'Mumbai',
  },
  {
    name: 'Rahul Verma',
    rating: 5,
    review: 'The marriage consultation gave us so much clarity. Thank you!',
    location: 'Delhi',
  },
  {
    name: 'Anjali Nair',
    rating: 4,
    review: 'Very detailed kundli analysis, explained everything patiently.',
    location: 'Bengaluru',
  },
];

const FAQS = [
  {
    question: 'How long is a consultation?',
    answer:
      'Consultation duration depends on the category chosen, typically 20-45 minutes.',
  },
  {
    question: 'How will consultation happen?',
    answer: 'Over a phone call or WhatsApp video call at your scheduled slot.',
  },
  {
    question: 'Can I reschedule?',
    answer:
      'Yes, contact us on WhatsApp or call at least a few hours before your slot.',
  },
  {
    question: 'Is payment refundable?',
    answer:
      'Payments are non-refundable once the consultation is confirmed, except in case of cancellation from our side.',
  },
  {
    question: 'What birth details are required?',
    answer:
      'Full name, date of birth, exact time of birth, and place of birth.',
  },
];

const CONTACT = {
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
  email: 'contact@astrologyconsultation.com',
  address: 'Office Address, City, State, India',
  mapsUrl: 'https://maps.google.com',
};

@Injectable()
export class HomeService {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly comboOfferService: ComboOfferService,
    private readonly paymentService: PaymentService,
  ) {}

  async getHome() {
    const [categories, combos, paymentConfig] = await Promise.all([
      this.consultationService.findAll(),
      this.comboOfferService.findAll(),
      this.paymentService.getActiveConfig().catch((err) => {
        if (err instanceof NotFoundException) return null;
        throw err;
      }),
    ]);

    return {
      categories,
      combos,
      stats: STATS,
      whyChooseUs: WHY_CHOOSE_US,
      howItWorks: HOW_IT_WORKS,
      testimonials: TESTIMONIALS,
      faqs: FAQS,
      contact: CONTACT,
      paymentConfig,
    };
  }
}
