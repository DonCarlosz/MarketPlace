import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Listing from '../models/Listing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const populate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    const u1 = await User.findOne({ email: 'akhuemokhanisaiah@gmail.com' });
    const u2 = await User.findOne({ email: 'martins@gmail.com' });

    if (!u1 || !u2) {
      console.error('One or both users not found!');
      process.exit(1);
    }

    // Set user locations: Isaiah in Uromi, Martins in Abraka
    u1.location = { city: 'Uromi', neighborhood: 'Market Road', coordinates: [6.3249, 6.7112] };
    await u1.save();

    u2.location = { city: 'Abraka', neighborhood: 'Campus Gate', coordinates: [6.1042, 5.7904] };
    await u2.save();

    console.log(`Updated Users: Isaiah (Uromi) and Martins (Abraka)`);

    // Clear existing listings for these two users
    await Listing.deleteMany({ seller: { $in: [u1._id, u2._id] } });

    const listingsData = [
      // ==========================================
      // USER 1: Akhuemokhan Isaiah (Located in Uromi, Edo State)
      // ==========================================

      // 1. Second-hand: Electronics
      {
        seller: u1._id,
        mode: 'second-hand',
        title: 'Sony WH-1000XM4 Wireless Noise-Canceling Headphones',
        description:
          'Used for about 6 months in home office. Outstanding sound quality and battery life. Includes original hard carry case, USB-C charging cable, and audio jack cable. Clean condition.',
        price: 185000,
        priceType: 'negotiable',
        category: 'Electronics',
        condition: 'like-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Mission Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Meet at Uromi Main Market junction or Bank premises.',
        status: 'active',
      },

      // 2. Second-hand: Sports & Outdoors
      {
        seller: u1._id,
        mode: 'second-hand',
        title: 'Specialized Allez Road Bike - 54cm Shimano Claris',
        description:
          'Well-maintained Specialized road bike. Lightweight aluminum frame with carbon fork. 2x8 Shimano drivetrain. Recently tuned up with fresh handlebar grip tape and brake pads. Great commuter or fitness road bike.',
        price: 350000,
        priceType: 'negotiable',
        category: 'Sports & Outdoors',
        condition: 'good',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Old Agbor Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Test ride and inspection at Uromi Township Stadium parking.',
        status: 'active',
      },

      // 3. Second-hand: Tools
      {
        seller: u1._id,
        mode: 'second-hand',
        title: 'DeWalt 20V Max Cordless Drill & Impact Driver Combo Kit',
        description:
          'Complete kit including brushless drill/driver, impact driver, two 2.0Ah lithium-ion batteries, charger, and ballistic contractor bag. Only used for one home shelving project.',
        price: 120000,
        priceType: 'fixed',
        category: 'Tools',
        condition: 'good',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Eguare',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Eguare Town Hall area.',
        status: 'active',
      },

      // 4. New Items: Gadgets & Tech
      {
        seller: u1._id,
        mode: 'new',
        title: 'Keychron K2 Wireless Mechanical Keyboard (RGB Hot-Swappable)',
        description:
          'Brand new, unopened box with factory shrink wrap. Gateron G Pro Brown tactile switches, aluminum bezel frame, Mac & Windows keycaps included. Bluetooth 5.1 and wired USB-C mode.',
        price: 85000,
        priceType: 'fixed',
        category: 'Gadgets & Tech',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Mission Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Direct handover at commercial bank ATM gallery.',
        status: 'active',
      },

      // 5. New Items: Fitness & Gear
      {
        seller: u1._id,
        mode: 'new',
        title: 'Adjustable Cast Iron Dumbbells Set (50 lbs with Case)',
        description:
          'Factory sealed adjustable dumbbell weight set. Includes 2x handles, 4x 5lb plates, 4x 2.5lb plates, 4x spin-lock collars, and heavy-duty blow-molded carrying case. Rust-resistant baked enamel finish.',
        price: 95000,
        priceType: 'fixed',
        category: 'Fitness & Gear',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Market Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Curbside exchange with easy car trunk loading.',
        status: 'active',
      },

      // 6. New Items: Handmade & Crafts
      {
        seller: u1._id,
        mode: 'new',
        title: 'Artisanal Ceramic Coffee Mug & Pour-Over Dripper Set',
        description:
          'Hand-thrown stoneware clay set crafted locally. Glazed in matte speckled cream and cobalt blue. Dishwasher and microwave safe. Holds 14oz. Comes packed securely in gift packaging.',
        price: 25000,
        priceType: 'fixed',
        category: 'Handmade & Crafts',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Amedokhian',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Amedokhian junction or local café.',
        status: 'active',
      },

      // 7. Services: Photography & Video (Fixed photoshoot package, NOT hourly!)
      {
        seller: u1._id,
        mode: 'service',
        title: 'Portrait, Brand & Graduation Photoshoots',
        description:
          'Professional photographer offering outdoor and urban lifestyle portrait sessions for graduates, creative professionals, and local entrepreneurs. Complete session package includes 2 outfits, 15 retouched digital high-res photos.',
        price: 45000,
        priceType: 'fixed',
        category: 'Photography & Video',
        serviceType: 'Portrait & Brand Photoshoot Package',
        availabilityNotes: 'Saturdays & Sundays; golden hour slots available.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Mission Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Agreed shoot location (parks, gardens, or studio).',
        status: 'active',
      },

      // 8. Services: Tutors & Lessons (Hourly billing)
      {
        seller: u1._id,
        mode: 'service',
        title: 'High School & College Mathematics / Calculus Tutoring',
        description:
          'Experienced STEM tutor with degree in Applied Mathematics. Specializing in Algebra I/II, WAEC/JAMB Math, Pre-Calculus, and Engineering Math. Concept-focused approach with proven student results.',
        price: 8000,
        priceType: 'hourly',
        category: 'Tutors & Lessons',
        serviceType: 'Math & STEM Tutoring',
        availabilityNotes: 'Monday through Thursday 4pm - 8pm; Saturday mornings.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Mission Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Quiet study center, library, or online video call.',
        status: 'active',
      },

      // 9. Services: Home Repair & Handyman (Fixed per-job installation)
      {
        seller: u1._id,
        mode: 'service',
        title: 'TV Wall Mounting & Shelf Installation Service',
        description:
          'Experienced local handyman ready to tackle your home setup tasks. Equipped with stud finders, levelers, impact drills, and heavy-duty anchors. Clean, precise, and secure installation.',
        price: 15000,
        priceType: 'fixed',
        category: 'Home Repair & Handyman',
        serviceType: 'Wall Mounting & Assembly',
        availabilityNotes: 'Available weekdays after 5pm and full day on weekends.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Uromi',
          neighborhood: 'Market Road',
          coordinates: [6.3249, 6.7112],
        },
        preferredMeetup: 'Service carried out in client home upon mutual message agreement.',
        status: 'active',
      },

      // ==========================================
      // USER 2: Martins (Located in Abraka, Delta State)
      // ==========================================

      // 10. Second-hand: Furniture
      {
        seller: u2._id,
        mode: 'second-hand',
        title: 'Scandinavian Solid Oak Dining Table with 4 Chairs',
        description:
          'Beautiful natural oak dining table with four ergonomic minimalist chairs. Table dimensions 60in x 36in. Clean surface with no deep scratches or water stains. Moving into smaller apartment, priced to sell quickly.',
        price: 280000,
        priceType: 'negotiable',
        category: 'Furniture',
        condition: 'good',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Campus Gate',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Ground floor apartment pickup near DELSU main gate.',
        status: 'active',
      },

      // 11. Second-hand: Vehicles
      {
        seller: u2._id,
        mode: 'second-hand',
        title: '2019 Honda Metropolitan 49cc Scooter - Low Miles',
        description:
          'Reliable 49cc 4-stroke commuter scooter. Gets over 100 MPG. Only 1,450 original miles. Clean title in hand, fresh synthetic oil change, new battery. Excellent student or local campus commuter.',
        price: 850000,
        priceType: 'negotiable',
        category: 'Vehicles',
        condition: 'like-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Expressway',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Meet outside neighborhood bank or university security post.',
        status: 'active',
      },

      // 12. Second-hand: Clothing & Shoes
      {
        seller: u2._id,
        mode: 'second-hand',
        title: 'Vintage Distressed Brown Leather Biker Jacket (Size M)',
        description:
          'Authentic 100% full-grain cowhide leather jacket. Heavyweight, brass YKK zippers in perfect working order. Warm quilted lining. Natural vintage patina gives it timeless character.',
        price: 65000,
        priceType: 'fixed',
        category: 'Clothing & Shoes',
        condition: 'fair',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Site II',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Public café where buyer can inspect jacket and try on.',
        status: 'active',
      },

      // 13. New Items: Electronics
      {
        seller: u2._id,
        mode: 'new',
        title: 'Anker 737 Power Bank (PowerCore 24K, 140W Fast Charging)',
        description:
          'Brand new sealed Anker flagship power bank. 24,000mAh capacity with ultra-powerful two-way 140W fast charging. Smart digital display shows output wattage and remaining battery time. Can fast charge MacBook Pro and phones simultaneously.',
        price: 75000,
        priceType: 'fixed',
        category: 'Electronics',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Campus Gate',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'University campus commercial center.',
        status: 'active',
      },

      // 14. New Items: Home Decor
      {
        seller: u2._id,
        mode: 'new',
        title: 'Smart Ambient RGB Floor Lamp with App & Voice Control',
        description:
          'Brand new in box minimalist corner floor lamp. 16 million colors, 300+ dynamic light modes, music sync visualization, and app control. Space-saving aluminum base.',
        price: 48000,
        priceType: 'fixed',
        category: 'Home Decor',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Site III',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Public restaurant parking lot in Abraka.',
        status: 'active',
      },

      // 15. New Items: Beauty & Personal Care
      {
        seller: u2._id,
        mode: 'new',
        title: 'Organic Rosemary & Mint Hair Growth & Scalp Care Bundle',
        description:
          'Factory sealed 3-piece hair wellness kit. Includes 100% pure rosemary essential oil scalp serum, clarifying mint shampoo, and scalp stimulation massager brush. All-natural, sulfate-free, cruelty-free.',
        price: 22000,
        priceType: 'fixed',
        category: 'Beauty & Personal Care',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1608248597358-1e3557e17812?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Campus Gate',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Near Campus Gate shopping complex.',
        status: 'active',
      },

      // 16. Services: Barbers & Hair (Fixed cut/fade price, NOT hourly!)
      {
        seller: u2._id,
        mode: 'service',
        title: 'Master Barber: Skin Fades, Beard Grooming & Hot Towel',
        description:
          'Licensed master barber with 8+ years experience. Specializing in low/mid/high skin fades, tapers, texturizing scissor cuts, straight razor line-ups, and luxury eucalyptus hot towel beard sculpting. High sanitary standards.',
        price: 8000,
        priceType: 'fixed',
        category: 'Barbers & Hair',
        serviceType: 'Fade, Cut & Hot Towel Package',
        availabilityNotes: 'Tuesday through Saturday 10am - 7pm by appointment.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Site II',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Private barber chair at Site II Grooming Lounge.',
        status: 'active',
      },

      // 17. Services: Auto Detailing & Mechanics (Starting-at base rate)
      {
        seller: u2._id,
        mode: 'service',
        title: 'Full Mobile Auto Detailing & Interior Steam Cleaning',
        description:
          'Professional mobile car detailing brought right to your compound. Comprehensive deep interior extraction, upholstery steam cleaning, leather conditioning, clay bar treatment, and hand carnauba waxing.',
        price: 35000,
        priceType: 'starting-at',
        category: 'Auto Detailing & Mechanics',
        serviceType: 'Mobile Car Detailing',
        availabilityNotes: 'Available 7 days a week; weather permitting for exterior wash.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Expressway',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Client driveway or residence parking space.',
        status: 'active',
      },

      // 18. Services: Nail & Lash Techs (Fixed set fee)
      {
        seller: u2._id,
        mode: 'service',
        title: 'Custom Gel Extensions & Minimalist Nail Art',
        description:
          'Certified nail technician specializing in Gel-X extensions, Builder in a Bottle (BIAB) structured manicures, and bespoke hand-painted nail art. 100% sanitized medical-grade autoclave tools.',
        price: 25000,
        priceType: 'fixed',
        category: 'Nail & Lash Techs',
        serviceType: 'Gel-X, BIAB & Nail Artistry',
        availabilityNotes: 'Thursdays through Mondays; evening appointments available.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Abraka',
          neighborhood: 'Campus Gate',
          coordinates: [6.1042, 5.7904],
        },
        preferredMeetup: 'Studio appointment near DELSU Campus Gate.',
        status: 'active',
      },
    ];

    const inserted = await Listing.insertMany(listingsData);
    console.log(`SUCCESSFULLY_UPDATED_${inserted.length}_NIGERIAN_LISTINGS`);
    process.exit(0);
  } catch (error) {
    console.error('Error populating listings:', error);
    process.exit(1);
  }
};

populate();
