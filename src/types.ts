export interface Product {
  id: string;
  name: string;
  category: 'steam-account' | 'steam-code' | 'discord-gift' | 'digital-game';
  price: number;
  description: string;
  image: string;
  badge?: string;
  deliveryType: 'instant' | 'escrow';
  region?: string;
  rating: number;
  reviewsCount: number;
}

export type Language = 'ar' | 'en';

export interface User {
  id: string;
  email: string;
  displayName: string;
  walletBalance: number;
  isAdmin?: boolean;
}
