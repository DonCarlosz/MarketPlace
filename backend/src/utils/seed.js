import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/local_marketplace');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing
    await User.deleteMany();
    await Listing.deleteMany();
    await Conversation.deleteMany();
    await Message.deleteMany();

    // Create Demo Users
    const salt = await bcrypt.genSalt(10);
    const demoPassword = await bcrypt.hash('password123', salt);

    const users = await User.create([
      {
        name: 'Marcus Miller',
        email: 'marcus@example.com',
        password: demoPassword,
        bio: 'Local craftsman and photographer. Always happy to meet at local cafés.',
        phone: '555-0192',
        location: {
          city: 'Downtown',
          neighborhood: 'Arts District',
          coordinates: [-122.3321, 47.6062],
        },
        isVerified: true,
      },
      {
        name: 'Elena Rostova',
        email: 'elena@example.com',
        password: demoPassword,
        bio: 'Barber & hair stylist with 7+ years experience. Specializing in modern fades.',
        phone: '555-0144',
        location: {
          city: 'Downtown',
          neighborhood: 'Midtown',
          coordinates: [-122.335, 47.61],
        },
        isVerified: true,
      },
      {
        name: 'David Chen',
        email: 'david@example.com',
        password: demoPassword,
        bio: 'Tech enthusiast and cyclist selling gear in great shape.',
        location: {
          city: 'Northside',
          neighborhood: 'University Hills',
          coordinates: [-122.313, 47.655],
        },
        isVerified: true,
      },
    ]);

    const [user1, user2, user3] = users;

    // Seed Sample Listings
    const listings = [
      // 1. Second-Hand Listings
      {
        seller: user3._id,
        mode: 'second-hand',
        title: 'Trek FX 3 Disc Hybrid Bike - Medium Frame',
        description:
          'Selling my lightly used Trek FX 3 hybrid bike. Shimano drivetrain, hydraulic disc brakes, upgraded puncture-resistant tires. Tuned up last month. Ready to ride.',
        price: 480,
        priceType: 'negotiable',
        category: 'Sports & Outdoors',
        condition: 'like-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Northside',
          neighborhood: 'University Hills',
          coordinates: [-122.313, 47.655],
        },
        preferredMeetup: 'University campus entrance or public library parking lot.',
        status: 'active',
      },
      {
        seller: user1._id,
        mode: 'second-hand',
        title: 'Mid-Century Modern Teak Armchair',
        description:
          'Authentic Danish design mid-century armchair. Re-upholstered in charcoal textured weave. Solid teak wood frame in outstanding condition.',
        price: 220,
        priceType: 'fixed',
        category: 'Furniture',
        condition: 'good',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Downtown',
          neighborhood: 'Arts District',
          coordinates: [-122.3321, 47.6062],
        },
        preferredMeetup: 'Pick up at lobby entrance or curbside handover.',
        status: 'active',
      },

      // 2. New Items Listings
      {
        seller: user3._id,
        mode: 'new',
        title: 'Wireless Active Noise-Cancelling Headphones (Factory Sealed)',
        description:
          'Brand new in box, never opened. Received as a corporate gift and already own a pair. Features 40hr battery life, multipoint Bluetooth, and deep bass.',
        price: 150,
        priceType: 'fixed',
        category: 'Electronics',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Northside',
          neighborhood: 'University Hills',
          coordinates: [-122.313, 47.655],
        },
        preferredMeetup: 'Meet at local shopping center café during daylight hours.',
        status: 'active',
      },
      {
        seller: user1._id,
        mode: 'new',
        title: 'Handcrafted Soy Wax Scented Candles (Set of 3)',
        description:
          'Hand-poured 100% natural soy wax candles with essential oils. Scents include Cedarwood & Amber, Lavender Sea Salt, and White Tea. 50+ hours burn time each.',
        price: 36,
        priceType: 'fixed',
        category: 'Home Decor',
        condition: 'brand-new',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Downtown',
          neighborhood: 'Arts District',
          coordinates: [-122.3321, 47.6062],
        },
        preferredMeetup: 'Direct handover outside the Arts District Community Center.',
        status: 'active',
      },

      // 3. Local Services Listings
      {
        seller: user2._id,
        mode: 'service',
        title: 'Classic Barber & Precision Beard Sculpting',
        description:
          'Licensed master barber available for bespoke cuts, fades, line-ups, and hot towel beard shaping. Clean sanitized tools, flexible appointment slots.',
        price: 45,
        priceType: 'hourly',
        category: 'Barbers & Hair',
        serviceType: 'Fade, Scissor Cut & Hot Towel Shave',
        availabilityNotes: 'Available Tuesday through Sunday by appointment.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Downtown',
          neighborhood: 'Midtown',
          coordinates: [-122.335, 47.61],
        },
        preferredMeetup: 'At private Midtown studio chair or mobile home visit upon mutual agreement.',
        status: 'active',
      },
      {
        seller: user1._id,
        mode: 'service',
        title: 'Portrait, Event & Portfolio Photography',
        description:
          'Professional portrait and creative branding sessions for creators, couples, and local entrepreneurs. Includes 1-hour shoot, 15 retouched high-res photos.',
        price: 120,
        priceType: 'starting-at',
        category: 'Photography & Video',
        serviceType: 'Outdoor & Studio Portraiture',
        availabilityNotes: 'Golden hour shoots preferred; weekends available.',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
          },
        ],
        location: {
          city: 'Downtown',
          neighborhood: 'Arts District',
          coordinates: [-122.3321, 47.6062],
        },
        preferredMeetup: 'Meet at agreed outdoor park or city photo location.',
        status: 'active',
      },
    ];

    await Listing.insertMany(listings);
    console.log(`Successfully seeded ${users.length} users and ${listings.length} listings!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
