import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Listing from '../models/Listing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedTimothy = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // 1. Check or create Timothy
    let timothy = await User.findOne({ email: 'timothy@localmarket.ng' });
    if (!timothy) {
      timothy = await User.findOne({ name: /^timothy$/i });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    const timothyData = {
      name: 'Timothy',
      email: 'timothy@localmarket.ng',
      password: hashedPassword,
      phone: '08035552341',
      bio: 'Verified vendor and skilled artisan based in Uromi, Edo State. Specializing in quality smartphones, sound equipment, solar generators, and certified home electrical repairs. Transparent deals with safe physical inspection at Uromi Main Market or Mission Road.',
      location: {
        city: 'Uromi',
        neighborhood: 'Market Road, Uromi',
        coordinates: [6.3249, 6.7112],
      },
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      role: 'user',
      feedbackScore: 100,
      positivePercentage: 100,
      detailedRatings: {
        itemAccuracy: 5.0,
        communication: 5.0,
        punctuality: 4.9,
      },
    };

    if (timothy) {
      Object.assign(timothy, timothyData);
      await timothy.save();
      console.log('Updated existing seller Timothy:', timothy._id);
    } else {
      timothy = await User.create(timothyData);
      console.log('Created new seller Timothy:', timothy._id);
    }

    // 2. Remove any prior listings for Timothy before inserting fresh 10 listings
    await Listing.deleteMany({ seller: timothy._id });

    // 3. Define 10 rich listings in Uromi across all modes
    const listings = [
      // 1. Second-Hand: Electronics
      {
        seller: timothy._id,
        mode: 'second-hand',
        title: 'Apple iPhone 12 Pro 128GB Pacific Blue (Factory Unlocked)',
        description:
          'Neatly used iPhone 12 Pro in Pacific Blue. Battery health is at 85%. Face ID, True Tone, 5G, and cameras are 100% operational. Never opened or repaired. Comes with protective silicone case and Type-C lightning cable. Physical inspection welcome.',
        price: 360000,
        priceType: 'negotiable',
        category: 'Phones & Tablets',
        condition: 'like-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=800&q=80',
            caption: 'Front and back glass in pristine condition',
          },
        ],
        itemSpecifics: {
          Brand: 'Apple',
          Model: 'iPhone 12 Pro',
          Storage: '128 GB',
          Color: 'Pacific Blue',
          'Battery Health': '85%',
        },
        flawDescription: 'Micro scuff on the top aluminum bezel corner; screen is flawless with glass protector.',
        acceptsOffers: true,
        minimumOfferPrice: 330000,
        allowsDelivery: false,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Market Road, Uromi',
        },
        preferredMeetup: 'First Bank PLC ATM gallery, Market Road, Uromi.',
        status: 'active',
        views: 42,
        favoritesCount: 5,
      },

      // 2. Second-Hand: Laptops / Computers
      {
        seller: timothy._id,
        mode: 'second-hand',
        title: 'HP EliteBook 840 G6 Intel Core i5 8th Gen 16GB RAM 512GB SSD',
        description:
          'Clean UK-used business ultrabook. Core i5-8365U vPro, 16GB DDR4 RAM, 512GB NVMe SSD, backlit keyboard, fingerprint reader, and full HD 1080p IPS display. 4 to 5 hours battery backup. Includes original HP 65W smart charger.',
        price: 245000,
        priceType: 'negotiable',
        category: 'Computers & Tech',
        condition: 'good',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
            caption: 'HP EliteBook keyboard and display',
          },
        ],
        itemSpecifics: {
          Brand: 'HP',
          Model: 'EliteBook 840 G6',
          Processor: 'Intel Core i5-8365U',
          RAM: '16GB',
          Storage: '512GB NVMe SSD',
        },
        flawDescription: 'Very light palm rest wear from normal typing; hinges and screen are tight.',
        acceptsOffers: true,
        minimumOfferPrice: 220000,
        allowsDelivery: true,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Mission Road, Uromi',
        },
        preferredMeetup: 'Uromi Shopping Plaza concourse or Mission Road Junction.',
        status: 'active',
        views: 29,
        favoritesCount: 3,
      },

      // 3. Second-Hand: Appliances / TV
      {
        seller: timothy._id,
        mode: 'second-hand',
        title: 'Hisense 43-Inch 4K UHD Smart TV with HDR & Dolby Audio',
        description:
          'Crisp Hisense 43-inch Smart 4K TV. Netflix, YouTube, Prime Video pre-installed with built-in Wi-Fi and Bluetooth. Crystal-clear display with zero lines or dead pixels. Includes original remote control and sturdy desk stands.',
        price: 195000,
        priceType: 'negotiable',
        category: 'Electronics',
        condition: 'like-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
            caption: 'Hisense 4K Display running streaming apps',
          },
        ],
        itemSpecifics: {
          Brand: 'Hisense',
          'Screen Size': '43 Inches',
          Resolution: '4K UHD (3840x2160)',
          OS: 'VIDAA Smart OS',
        },
        flawDescription: 'No original retail carton box; will be securely bubble-wrapped for pickup.',
        acceptsOffers: true,
        minimumOfferPrice: 175000,
        allowsDelivery: false,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Ubiaja Road, Uromi',
        },
        preferredMeetup: 'TotalEnergies Station Forecourt (vehicle parking available for loading), Uromi.',
        status: 'active',
        views: 58,
        favoritesCount: 7,
      },

      // 4. Second-Hand: Power & Energy
      {
        seller: timothy._id,
        mode: 'second-hand',
        title: 'Lutian 3.5kVA Key-Starter Petrol Generator (LT3900DX) 100% Copper',
        description:
          'Strong 3.5kVA Lutian key-start generator with original copper coil winding. Powers deep freezer, 1HP inverter AC, TV, and all house lighting comfortably. Serviced regularly with genuine Mobil oil. Battery and starter motor in top shape.',
        price: 160000,
        priceType: 'negotiable',
        category: 'Home Appliances',
        condition: 'good',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
            caption: 'Lutian generator motor and frame',
          },
        ],
        itemSpecifics: {
          Brand: 'Lutian',
          Model: 'LT3900DX',
          Output: '3.5 kVA',
          'Starting System': 'Electric Key & Recoil Pull',
          Coil: '100% Copper',
        },
        flawDescription: 'A few cosmetic frame scratches from garage storage; engine starts on one key turn.',
        acceptsOffers: true,
        minimumOfferPrice: 145000,
        allowsDelivery: false,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Nova Road, Uromi',
        },
        preferredMeetup: 'NNPC Mega Station parking plaza, Uromi bypass.',
        status: 'active',
        views: 64,
        favoritesCount: 8,
      },

      // 5. Brand New: Sound & Audio
      {
        seller: timothy._id,
        mode: 'new',
        title: 'JBL PartyBox Stage 320 Portable Bluetooth Speaker (Original Sealed)',
        description:
          'Brand new, carton-sealed JBL PartyBox Stage 320. 240W RMS booming JBL Pro Sound with dynamic synchronized light show. Up to 18 hours playtime, splash-proof IPX4, telescopic handle and rugged wide wheels. 1-year official distributor warranty.',
        price: 520000,
        priceType: 'fixed',
        category: 'Electronics',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
            caption: 'Brand new in box with warranty seal',
          },
        ],
        itemSpecifics: {
          Brand: 'JBL',
          Model: 'PartyBox Stage 320',
          'Power Output': '240W RMS',
          'Battery Life': '18 Hours',
          Condition: 'Factory Sealed with Distributor Seal',
        },
        acceptsOffers: false,
        allowsDelivery: true,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Market Road, Uromi',
        },
        preferredMeetup: 'Uromi Main Market Commercial Bank Plaza.',
        status: 'active',
        views: 31,
        favoritesCount: 4,
      },

      // 6. Brand New: Solar Equipment
      {
        seller: timothy._id,
        mode: 'new',
        title: 'Felicity Solar 5kVA 48V Pure Sine Wave Hybrid Inverter + MPPT',
        description:
          'Factory-new Felicity Solar 5kVA/48V pure sine wave hybrid inverter with integrated 120A MPPT solar charge controller. Supports lithium LiFePO4 batteries and solar array up to 500V. Includes smart Wi-Fi monitoring module and 2-year warranty card.',
        price: 680000,
        priceType: 'negotiable',
        category: 'Home Appliances',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
            caption: 'Felicity solar hybrid inverter with MPPT display',
          },
        ],
        itemSpecifics: {
          Brand: 'Felicity Solar',
          Capacity: '5000 VA / 5000 Watts',
          'System Voltage': '48 Volts',
          'Charge Controller': '120A MPPT',
          Warranty: '2 Years Manufacturer Warranty',
        },
        acceptsOffers: true,
        minimumOfferPrice: 650000,
        allowsDelivery: true,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Angle 90 Junction, Uromi',
        },
        preferredMeetup: 'Zenith Bank Branch Forecourt, Mission Road, Uromi.',
        status: 'active',
        views: 76,
        favoritesCount: 11,
      },

      // 7. Brand New: Smartphone Accessories / Power Bank
      {
        seller: timothy._id,
        mode: 'new',
        title: 'Oraimo 40,000mAh PowerBox 400 22.5W Fast Charging Power Bank',
        description:
          '100% Genuine Oraimo PowerBox 400. Massive 40,000mAh capacity with 22.5W AniFast high-speed protocol. Charges 4 devices simultaneously with Type-C input/output, dual USB-A, and micro USB. Built-in LED torchlight and digital power display.',
        price: 38000,
        priceType: 'fixed',
        category: 'Phones & Tablets',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?auto=format&fit=crop&w=800&q=80',
            caption: 'Sealed Oraimo packaging with scratch verification code',
          },
        ],
        itemSpecifics: {
          Brand: 'Oraimo',
          Model: 'OPB-P400DN',
          Capacity: '40,000 mAh',
          'Fast Charging': '22.5W AniFast',
        },
        acceptsOffers: false,
        allowsDelivery: true,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Market Road, Uromi',
        },
        preferredMeetup: 'Uromi Main Market Front Gates.',
        status: 'active',
        views: 52,
        favoritesCount: 9,
      },

      // 8. Service: Solar Installation & Electrical Wiring
      {
        seller: timothy._id,
        mode: 'service',
        title: 'Professional Solar Inverter & Residential Electrical Installation',
        description:
          'Certified electrical engineering services across Uromi, Ekpoma, and Irrua. We provide load assessment, solar panel rooftop mounting, inverter wiring, battery bank balancing, changeover switch installations, and domestic surge protection.',
        price: 35000,
        priceType: 'starting-at',
        category: 'Home Services & Trades',
        condition: 'not-applicable',
        serviceType: 'Solar & Electrical Engineering',
        availabilityNotes: 'Monday through Saturday, 8:00 AM - 6:00 PM. Emergency breakdown callouts available.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
            caption: 'On-site solar panel and inverter installation setup',
          },
        ],
        itemSpecifics: {
          Specialization: 'Solar Hybrid Systems & Home Conduit Wiring',
          'Coverage Areas': 'Uromi, Ubiaja, Ekpoma, Irrua, Edo Central',
          Experience: '8+ Years Certified Electrician',
        },
        acceptsOffers: true,
        minimumOfferPrice: 30000,
        allowsDelivery: false,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Mission Road, Uromi',
        },
        preferredMeetup: 'Initial consultation at Uromi civic center café or direct site inspection.',
        status: 'active',
        views: 88,
        favoritesCount: 14,
      },

      // 9. Service: Generator Servicing & Mechanical Repair
      {
        seller: timothy._id,
        mode: 'service',
        title: 'Generator Engine Overhaul, Carburetor Tuning & Copper Coil Rewinding',
        description:
          'Specialist repair services for all petrol and diesel generators (Lutian, Tiger, Elepaq, Firman, Mikano). Services include carburetor cleaning, valve clearance adjustment, piston ring overhaul, governor calibration, and copper coil rewinding.',
        price: 15000,
        priceType: 'starting-at',
        category: 'Repairs & Tech',
        condition: 'not-applicable',
        serviceType: 'Generator Mechanic',
        availabilityNotes: 'Daily 7:30 AM - 6:30 PM. Workshop located near Market Road; doorstep diagnostic visits available.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
            caption: 'Diagnostic inspection and mechanical tools',
          },
        ],
        itemSpecifics: {
          'Supported Brands': 'Firman, Elepaq, Lutian, Tiger, Sumec',
          'Service Types': 'Overhaul, Servicing, Electrical Rewinding',
          Turnaround: 'Same day for standard servicing',
        },
        acceptsOffers: true,
        minimumOfferPrice: 10000,
        allowsDelivery: false,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Market Road, Uromi',
        },
        preferredMeetup: 'Timothy Mechanical Workshop, Opp. Market Square, Uromi.',
        status: 'active',
        views: 45,
        favoritesCount: 6,
      },

      // 10. Service: Smartphone & Laptop Hardware Repair
      {
        seller: timothy._id,
        mode: 'service',
        title: 'Smartphone & Laptop Screen Replacement, Board Soldering & Battery Swap',
        description:
          'Quick turnaround gadget repair in Uromi. Certified technicians for iPhone, Samsung, Tecno, Infinix, and HP/Dell laptops. Original screen replacements, charging port micro-soldering, motherboard diagnostics, and fresh battery swaps with warranty.',
        price: 8000,
        priceType: 'starting-at',
        category: 'Repairs & Tech',
        condition: 'not-applicable',
        serviceType: 'Electronics & Gadget Repair',
        availabilityNotes: 'Monday - Saturday, 9:00 AM - 7:00 PM. Most screen and battery swaps completed in under 45 minutes.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=800&q=80',
            caption: 'Precision PCB soldering and screen assembly bench',
          },
        ],
        itemSpecifics: {
          Devices: 'iPhones, Android Phones, MacBooks, Windows Laptops',
          Turnaround: '30-45 minutes for screens and batteries',
          Warranty: '90-day parts warranty on screen replacements',
        },
        acceptsOffers: false,
        allowsDelivery: false,
        location: {
          type: 'Point',
          coordinates: [6.3249, 6.7112],
          city: 'Uromi',
          neighborhood: 'Mission Road, Uromi',
        },
        preferredMeetup: 'Timothy Tech Hub, Mission Road Commercial Centre, Uromi.',
        status: 'active',
        views: 67,
        favoritesCount: 12,
      },
    ];

    const createdListings = await Listing.insertMany(listings);
    console.log(`Successfully created ${createdListings.length} listings for Timothy in Uromi!`);

    await mongoose.disconnect();
    console.log('MongoDB disconnected successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding Timothy:', err);
    process.exit(1);
  }
};

seedTimothy();
