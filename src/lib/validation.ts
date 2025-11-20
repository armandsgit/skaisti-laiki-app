import { z } from 'zod';

// Booking validation schema
export const bookingSchema = z.object({
  service_id: z.string().uuid('Nederīgs pakalpojuma ID'),
  booking_date: z.string().refine(
    (date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    },
    { message: 'Rezervācijas datumam jābūt šodien vai nākotnē' }
  ),
  booking_time: z.string().regex(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'Nederīgs laika formāts (izmantojiet HH:MM)'
  ),
  notes: z.string().max(500, 'Piezīmes nedrīkst pārsniegt 500 rakstzīmes').optional()
});

// Service creation validation schema
export const serviceSchema = z.object({
  name: z.string()
    .min(1, 'Pakalpojuma nosaukums ir obligāts')
    .max(100, 'Nosaukums nedrīkst pārsniegt 100 rakstzīmes')
    .trim(),
  price: z.number({
    required_error: 'Cena ir obligāta',
    invalid_type_error: 'Cenai jābūt skaitlim'
  })
    .positive('Cenai jābūt pozitīvam skaitlim')
    .max(10000, 'Cena nedrīkst pārsniegt 10000 EUR'),
  duration: z.number({
    required_error: 'Ilgums ir obligāts',
    invalid_type_error: 'Ilgumam jābūt skaitlim'
  })
    .int('Ilgumam jābūt veselam skaitlim')
    .positive('Ilgumam jābūt pozitīvam')
    .max(480, 'Ilgums nedrīkst pārsniegt 480 minūtes (8 stundas)'),
  description: z.string()
    .max(1000, 'Apraksts nedrīkst pārsniegt 1000 rakstzīmes')
    .optional()
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Vārds ir obligāts')
    .max(100, 'Vārds nedrīkst pārsniegt 100 rakstzīmes')
    .trim(),
  phone: z.string()
    .regex(/^[\d\s+()-]+$/, 'Nederīgs tālruņa numura formāts')
    .min(8, 'Tālruņa numurs ir pārāk īss')
    .max(20, 'Tālruņa numurs ir pārāk garš')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(2000, 'Bio nedrīkst pārsniegt 2000 rakstzīmes')
    .optional()
});

// Address validation schema
export const addressSchema = z.object({
  address: z.string()
    .min(5, 'Adrese ir pārāk īsa')
    .max(200, 'Adrese nedrīkst pārsniegt 200 rakstzīmes')
    .regex(/^[a-zA-ZĀ-žĀ-Ž0-9\s,.-]+$/, 'Adresē ir nederīgas rakstzīmes')
    .trim(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
