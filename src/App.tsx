/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Gamepad2, 
  ShoppingCart, 
  ShieldCheck, 
  Zap, 
  Trophy, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  Star,
  Globe,
  User as UserIcon,
  Sun,
  Moon,
  ArrowRight,
  Filter,
  CreditCard,
  Bitcoin,
  Trash2,
  Plus,
  Minus,
  Lock,
  Phone,
  Mail,
  Wallet,
  History,
  TrendingDown,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TRANSLATIONS, SAMPLE_PRODUCTS, COUNTRIES, Country } from './constants';
import { AppLanguage } from './enums';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile, createUserProfile, depositFunds, withdrawFunds, getTransactions, type UserProfile, type WalletTransaction } from './services/walletService';

// --- Types ---
interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

type AuthMode = 'login' | 'register' | null;

export default function App() {
  const [lang, setLang] = useState<AppLanguage>(AppLanguage.ARABIC);
  const [isDark, setIsDark] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [walletAmount, setWalletAmount] = useState('');
  
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const t = TRANSLATIONS[lang];
  const isRtl = lang === AppLanguage.ARABIC;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        if (p) {
          setProfile(p);
        } else {
          // If profile doesn't exist, create it (e.g. after Google Login)
          await createUserProfile(u.uid, u.email || '', u.displayName || 'Gamer');
          const newP = await getUserProfile(u.uid);
          setProfile(newP);
        }
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isProfileOpen && user) {
      loadTransactions();
      const interval = setInterval(async () => {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isProfileOpen, user]);

  const loadTransactions = async () => {
    const data = await getTransactions();
    setTransactions(data);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(walletAmount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      await depositFunds(amt);
      setWalletAmount('');
      const p = await getUserProfile(user.uid);
      setProfile(p);
      loadTransactions();
      alert(isRtl ? 'تم الشحن بنجاح!' : 'Deposit successful!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(walletAmount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      await withdrawFunds(amt);
      setWalletAmount('');
      const p = await getUserProfile(user.uid);
      setProfile(p);
      loadTransactions();
      alert(isRtl ? 'تم السحب بنجاح!' : 'Withdrawal successful!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthMode(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsProfileOpen(false);
  };

  // Effects
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    document.documentElement.classList.toggle('dark', isDark);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDark]);

  useEffect(() => {
    if (authMode || isCartOpen || isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [authMode, isCartOpen, isMenuOpen]);

  // Derived State
  const filteredProducts = useMemo(() => {
    return SAMPLE_PRODUCTS.filter(product => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) || 
      c.dialCode.includes(countrySearchQuery)
    );
  }, [countrySearchQuery]);

  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Handlers
  const toggleLang = () => {
    setLang(prev => prev === AppLanguage.ARABIC ? AppLanguage.ENGLISH : AppLanguage.ARABIC);
  };

  const addToCart = (product: typeof SAMPLE_PRODUCTS[0]) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const scrollToStore = () => {
    const el = document.getElementById('store-grid');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categories = [
    { id: 'all', name: isRtl ? 'الكل' : 'All', icon: <Gamepad2 size={18} /> },
    { id: 'steam-account', name: t.steamAccounts, icon: <Trophy size={18} /> },
    { id: 'steam-code', name: t.steamCodes, icon: <Zap size={18} /> },
    { id: 'discord-gift', name: t.discordNitro, icon: <Star size={18} /> },
    { id: 'digital-game', name: t.digitalGames, icon: <Search size={18} /> },
  ];

  return (
    <div className={`min-h-screen ${isRtl ? 'rtl text-right' : 'ltr text-left'} bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 font-sans`}>
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${isScrolled ? 'glass-header py-3 shadow-lg' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8 }}
              className="w-10 h-10 gaming-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              <Gamepad2 className="text-white" size={24} />
            </motion.div>
            <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">
              {t.appName.split(' ').map((word, i) => (
                <span key={i} className={i === 1 ? 'text-[var(--accent-primary)]' : ''}>{word} </span>
              ))}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-10 flex-grow px-12">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs font-bold hover:text-[var(--accent-primary)] transition-colors uppercase tracking-widest relative group whitespace-nowrap">
              {t.home}
              <span className="absolute -bottom-1 start-0 w-0 h-0.5 gaming-gradient transition-all group-hover:w-full" />
            </button>
            <div className="relative w-full max-w-md">
              <Search size={16} className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[var(--text-secondary)]`} />
              <input 
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2.5 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-medium text-sm`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => scrollToStore()} className="lg:hidden p-2.5 hover:bg-[var(--bg-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--border-color)]">
              <Search size={20} />
            </button>
            <button onClick={() => setIsCartOpen(true)} className="p-2.5 hover:bg-[var(--bg-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--border-color)] relative">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 gaming-gradient text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)]">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={toggleLang} className="p-2.5 hover:bg-[var(--bg-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--border-color)]">
              <Globe size={20} />
            </button>
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 hover:bg-[var(--bg-secondary)] rounded-xl transition-all border border-transparent hover:border-[var(--border-color)]">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-3 ps-4 border-s border-[var(--border-color)]">
              {user ? (
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-[var(--accent-primary)] transition-all group"
                >
                  <div className="w-8 h-8 gaming-gradient rounded-lg flex items-center justify-center text-white text-xs font-black">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{isRtl ? 'الرصيد' : 'Balance'}</span>
                    <span className="text-[14px] font-black tracking-tight text-[var(--accent-primary)]">${profile?.balance.toFixed(2) || '0.00'}</span>
                  </div>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setAuthMode('login')}
                    className="px-4 py-2 text-sm font-bold hover:text-[var(--accent-primary)] transition-colors"
                    id="login-btn"
                  >
                    {t.login}
                  </button>
                  <button 
                    onClick={() => setAuthMode('register')}
                    className="px-6 py-2.5 gaming-gradient text-white text-sm font-black rounded-xl hover:shadow-xl hover:shadow-emerald-500/20 transition-all uppercase italic"
                    id="register-btn"
                  >
                    {t.register}
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 md:pt-32">
        
        {/* Simplified Hero Context */}
        <section className="pb-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-7xl font-black uppercase italic leading-none tracking-tighter mb-4"
              >
                {t.heroTitle}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[var(--text-secondary)] font-medium max-w-2xl"
              >
                {t.heroSubtitle}
              </motion.p>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-8 border-y border-[var(--border-color)] bg-[var(--bg-secondary)]/30 sticky top-[68px] z-40 glass-header">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
               <div className="flex items-center gap-2 me-4 pe-4 border-e border-[var(--border-color)] shrink-0">
                  <Filter size={18} className="text-[var(--text-secondary)]" />
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">{t.categories}</span>
               </div>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); scrollToStore(); }}
                  className={`flex-shrink-0 flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border ${
                    activeCategory === cat.id 
                    ? 'gaming-gradient border-transparent text-white shadow-xl shadow-emerald-500/10' 
                    : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]'
                  }`}
                >
                  {cat.icon}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section id="store-grid" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: 64 }}
                  viewport={{ once: true }}
                  className="h-1.5 gaming-gradient rounded-full mb-3" 
                />
                <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">
                  {t.featuredProducts}
                  {activeCategory !== 'all' && ` - ${categories.find(c => c.id === activeCategory)?.name}`}
                </h2>
              </div>
              <button 
                onClick={() => {setActiveCategory('all'); setSearchQuery('');}}
                className="group flex items-center gap-2 text-[var(--accent-primary)] font-black text-xs uppercase tracking-widest hover:gap-4 transition-all"
              >
                {t.browseAll}
                <ChevronRight size={18} className={`${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layoutId={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="gaming-card h-full flex flex-col overflow-hidden group">
                      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--bg-secondary)]">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 gap-3">
                          <p className="text-white text-xs font-medium line-clamp-3 mb-2 translate-y-4 group-hover:translate-y-0 transition-transform">
                            {product.description}
                          </p>
                          <button 
                            onClick={() => addToCart(product)}
                            className="w-full py-4 gaming-gradient text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform hover:shadow-emerald-500/40 active:scale-95"
                          >
                            <ShoppingCart size={16} />
                            {t.addToCart}
                          </button>
                        </div>
                        
                        {product.badge && (
                          <div className="absolute top-4 start-4 px-3 py-1 bg-pink-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                            {product.badge}
                          </div>
                        )}
                        <div className="absolute top-4 end-4 w-9 h-9 bg-black/60 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 text-white">
                           <Trophy size={16} className={idx < 2 ? 'text-yellow-400' : 'text-white/40'} />
                        </div>
                      </div>

                      <div className="p-5 flex-grow flex flex-col">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] mb-2">
                          {product.category.replace('-', ' ')}
                        </div>
                        <h3 className="text-lg font-bold line-clamp-1 mb-2 group-hover:text-[var(--accent-primary)] transition-colors">{product.name}</h3>
                        <div className="flex items-center gap-1 mb-4">
                          <Star size={14} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-bold">{product.rating}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-medium">({product.reviewsCount})</span>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{isRtl ? 'السعر' : 'Price'}</span>
                             <span className="text-xl font-black tracking-tight">${product.price.toFixed(2)}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-[var(--accent-primary)] transition-colors">
                             <Zap size={18} className="text-[var(--accent-primary)]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={40} className="text-[var(--text-secondary)]" />
                </div>
                <h3 className="text-2xl font-black uppercase italic mb-2">{t.noResults}</h3>
                <button onClick={() => {setSearchQuery(''); setActiveCategory('all');}} className="text-[var(--accent-primary)] font-bold uppercase tracking-widest hover:underline">
                  {isRtl ? 'عرض كل الممنتجات' : 'View all products'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Global Stats */}
        <section className="py-24 border-t border-[var(--border-color)]">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
              {[
                { count: '50k+', label: isRtl ? 'عميل نشط' : 'Active Customers', icon: <UserIcon size={32} /> },
                { count: '100k+', label: isRtl ? 'عملية ناجحة' : 'Successful Orders', icon: <Zap size={32} /> },
                { count: '100%', label: isRtl ? 'أمان تام' : 'Full Protection', icon: <ShieldCheck size={32} /> },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="w-16 h-16 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] mb-6 group-hover:gaming-gradient group-hover:text-white transition-all transform group-hover:scale-110 group-hover:rotate-6">
                    {stat.icon}
                  </div>
                  <span className="text-5xl font-black uppercase italic mb-2">{stat.count}</span>
                  <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="py-12 bg-[var(--bg-secondary)]/50">
           <div className="max-w-7xl mx-auto px-4 md:px-8">
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-40 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-pointer">
                    <CreditCard size={24} />
                    <span className="font-black italic uppercase text-xs">Stripe</span>
                 </div>
                 <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-pointer">
                    <Bitcoin size={24} />
                    <span className="font-black italic uppercase text-xs">Crypto</span>
                 </div>
                 <div className="flex items-center gap-10 border-s border-[var(--border-color)] ps-16 hidden md:flex">
                    <div className="flex flex-col items-center gap-1">
                       <ShieldCheck size={20} className="text-green-500" />
                       <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t.safetyFirst}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                       <Zap size={20} className="text-yellow-500" />
                       <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t.instantDelivery}</span>
                    </div>
                 </div>
              </div>
           </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="pt-24 pb-20 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 gaming-gradient rounded-xl flex items-center justify-center">
                  <Gamepad2 className="text-white" size={18} />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase italic">
                   {t.appName}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed mb-8">
                Elite gaming destination for digital assets. Global delivery, secure transactions, and 24/7 support.
              </p>
              <div className="flex gap-4">
                 {['Fb', 'Tw', 'Ig', 'Dc'].map(s => (
                   <button key={s} className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-black text-xs hover:gaming-gradient hover:text-white transition-all">
                     {s}
                   </button>
                 ))}
              </div>
            </div>

            {[
              { title: t.categories, items: [t.steamAccounts, t.steamCodes, t.discordNitro, t.digitalGames] },
              { title: t.shop, items: [t.home, t.shop, t.featuredProducts, t.bestSellers] },
              { title: t.support, items: ['Live Chat', 'Dispute Center', 'Secure Shield', 'Terms'] }
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-8 italic">{col.title}</h4>
                <ul className="flex flex-col gap-4">
                  {col.items.map((item, j) => (
                    <li key={j}>
                      <a href="#" className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors uppercase tracking-widest">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-10 border-t border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-6">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-secondary)] italic">© 2026 {t.appName}. Designed for legends.</p>
             <div className="flex items-center gap-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Security Shield</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Privacy Protocol</span>
             </div>
          </div>
        </div>
      </footer>

      {/* --- Overlays & Modals --- */}

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 z-[60] modal-overlay"
            />
            <motion.div 
              initial={{ x: isRtl ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '-100%' : '100%' }}
              transition={{ tension: 300, friction: 30 }}
              className={`fixed top-0 bottom-0 ${isRtl ? 'left-0' : 'right-0'} w-full max-w-md bg-[var(--bg-primary)] z-[70] shadow-2xl flex flex-col`}
            >
              <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gaming-gradient rounded-xl flex items-center justify-center text-white">
                    <ShoppingCart size={22} />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic">{t.cart}</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-[var(--bg-secondary)] rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 no-scrollbar">
                {cartItems.length > 0 ? (
                  <div className="space-y-6">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                        <img src={item.image} className="w-20 h-24 object-cover rounded-xl" alt={item.name} />
                        <div className="flex-grow">
                          <h4 className="font-bold text-sm mb-1 line-clamp-1">{item.name}</h4>
                          <span className="text-lg font-black text-[var(--accent-primary)] tracking-tight">${item.price.toFixed(2)}</span>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-1">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-[var(--accent-primary)]"><Minus size={14} /></button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[var(--accent-primary)]"><Plus size={14} /></button>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <ShoppingCart size={80} strokeWidth={1} />
                    <p className="mt-4 font-black uppercase tracking-widest">{t.emptyCart}</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t.total}</span>
                  <span className="text-3xl font-black italic tracking-tighter">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  disabled={cartItems.length === 0}
                  className="w-full py-5 gaming-gradient text-white rounded-2xl font-black text-lg uppercase italic shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-emerald-500/40 active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <CreditCard size={24} />
                  {t.checkout}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {authMode && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthMode(null)}
              className="fixed inset-0 z-[100] modal-overlay"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--bg-primary)] z-[110] p-10 rounded-[3rem] shadow-2xl border border-[var(--border-color)]"
            >
              <button 
                onClick={() => setAuthMode(null)}
                className={`absolute ${isRtl ? 'left-6' : 'right-6'} top-6 p-2 hover:bg-[var(--bg-secondary)] rounded-xl transition-all`}
              >
                <X size={20} />
              </button>

              <div className="text-center mb-10">
                <div className="w-16 h-16 gaming-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-emerald-500/20">
                  <UserIcon size={32} />
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                  {authMode === 'login' ? t.loginTitle : t.registerTitle}
                </h3>
              </div>

              <div className="mb-8">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white text-black border border-gray-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isRtl ? 'المتابعة باستخدام جوجل' : 'Continue with Google'}
                </button>
                
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex-grow h-px bg-[var(--border-color)]" />
                  <span className="text-[10px] font-black uppercase text-[var(--text-secondary)]">{isRtl ? 'أو' : 'OR'}</span>
                  <div className="flex-grow h-px bg-[var(--border-color)]" />
                </div>
              </div>

              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert(isRtl ? 'تم إنشاء الحساب بنجاح! تفقد بريدك للتفعيل.' : 'Account created successfully! Check your email to activate.'); setAuthMode(null); }}>
                {authMode === 'register' && (
                  <>
                    <div className="relative">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 ms-2">{t.username}</label>
                      <UserIcon size={18} className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-[46px] text-[var(--text-secondary)]`} />
                      <input 
                        required
                        type="text" 
                        placeholder={isRtl ? 'اسمك الكامل' : 'Full Name'}
                        className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-bold text-sm`}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 ms-2">{t.phoneNumber}</label>
                      <div className="flex gap-2">
                        <div className="relative shrink-0">
                          <button 
                            type="button"
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className={`flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 ${isRtl ? 'pr-4 pl-8' : 'pl-4 pr-8'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all font-bold text-sm min-w-[120px]`}
                          >
                            <span>{selectedCountry.flag}</span>
                            <span>{selectedCountry.dialCode}</span>
                            <ChevronRight size={14} className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 rotate-90 opacity-40`} />
                          </button>

                          <AnimatePresence>
                            {isCountryDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-[120]" onClick={() => setIsCountryDropdownOpen(false)} />
                                <motion.div 
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className={`absolute top-full ${isRtl ? 'right-0' : 'left-0'} mt-2 w-72 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-[300px]`}
                                >
                                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                                    <div className="relative">
                                      <Search size={14} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-[var(--text-secondary)]`} />
                                      <input 
                                        type="text"
                                        autoFocus
                                        placeholder={isRtl ? 'بحث...' : 'Search...'}
                                        value={countrySearchQuery}
                                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                                        className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-all`}
                                      />
                                    </div>
                                  </div>
                                  <div className="overflow-y-auto no-scrollbar">
                                    {filteredCountries.map((country) => (
                                      <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCountry(country);
                                          setIsCountryDropdownOpen(false);
                                          setCountrySearchQuery('');
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors text-xs font-bold"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span>{country.flag}</span>
                                          <span>{country.name}</span>
                                        </div>
                                        <span className="text-[var(--text-secondary)]">{country.dialCode}</span>
                                      </button>
                                    ))}
                                    {filteredCountries.length === 0 && (
                                      <div className="p-4 text-center text-xs text-[var(--text-secondary)] font-bold uppercase italic">
                                        {isRtl ? 'لا توجد نتائج' : 'No results'}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="relative flex-grow">
                          <Phone size={18} className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-[var(--text-secondary)]`} />
                          <input 
                            required
                            type="tel" 
                            placeholder="9xx xxx xxx"
                            className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-bold text-sm`}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 ms-2">{t.email}</label>
                  <Mail size={18} className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-[46px] text-[var(--text-secondary)]`} />
                  <input 
                    required
                    type="email" 
                    placeholder="example@gmail.com"
                    className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-bold text-sm`}
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 ms-2">{t.password}</label>
                  <Lock size={18} className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-[46px] text-[var(--text-secondary)]`} />
                  <input 
                    required
                    type="password" 
                    placeholder="••••••••"
                    className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-bold text-sm`}
                  />
                </div>

                {authMode === 'register' && (
                  <>
                    <div className="relative">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 ms-2">{t.confirmPassword}</label>
                      <ShieldCheck size={18} className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-[46px] text-[var(--text-secondary)]`} />
                      <input 
                        required
                        type="password" 
                        placeholder="••••••••"
                        className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl py-4 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-bold text-sm`}
                      />
                    </div>
                    <div className="flex items-start gap-3 px-2">
                      <input required type="checkbox" id="terms" className="mt-1 w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
                      <label htmlFor="terms" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer leading-relaxed">
                        {isRtl ? 'أوافق على سياسة الخصوصية وشروط استخدام سوريا جيمينج هب' : 'I agree to the Privacy Policy and SYRIA GAMING HUB Terms of Use'}
                      </label>
                    </div>
                  </>
                )}
                
                {authMode === 'login' && (
                  <button className="text-xs font-bold text-[var(--accent-primary)] hover:underline uppercase tracking-widest block mx-auto">{t.forgotPassword}</button>
                )}

                <button type="submit" className="w-full py-5 gaming-gradient text-white rounded-2xl font-black text-lg uppercase italic shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 transition-all mt-4">
                  {authMode === 'login' ? t.login : t.joinNow}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest"
                >
                  {authMode === 'login' ? isRtl ? 'ليس لديك حساب؟ سجل الآن' : "Don't have an account? Join" : isRtl ? 'لديك حساب؟ سجل دخول' : 'Already have an account? Login'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile & Wallet Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="fixed inset-0 z-[100] modal-overlay"
            />
            <motion.div 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              className={`fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} w-full max-w-lg bg-[var(--bg-primary)] z-[110] shadow-2xl flex flex-col p-8`}
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 gaming-gradient rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                     <UserIcon size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{profile?.username}</h3>
                    <p className="text-xs font-bold text-[var(--text-secondary)]">{profile?.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-3 bg-[var(--bg-secondary)] rounded-2xl">
                  <X size={24} />
                </button>
              </div>

              {/* Wallet Card */}
              <div className="p-8 gaming-gradient rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/20 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wallet size={120} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                  <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">{isRtl ? 'إجمالي الرصيد' : 'TOTAL BALANCE'}</span>
                  <h4 className="text-5xl font-black italic tracking-tighter mb-8">${profile?.balance.toFixed(2)}</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                      <TrendingUp size={16} className="mb-2" />
                      <div className="text-[10px] font-bold uppercase opacity-60">{isRtl ? 'إيداع' : 'Deposit'}</div>
                      <div className="font-black">+$0.00</div>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                      <TrendingDown size={16} className="mb-2" />
                      <div className="text-[10px] font-bold uppercase opacity-60">{isRtl ? 'صرف' : 'Spent'}</div>
                      <div className="font-black">-$0.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Actions */}
              <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 border border-[var(--border-color)] mb-8">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-4 ms-2">{isRtl ? 'مبلغ الشحن / السحب' : 'DEPOSIT / WITHDRAW AMOUNT'}</label>
                <div className="flex gap-3">
                  <div className="relative flex-grow">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-lg opacity-40">$</span>
                    <input 
                      type="number"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-6 focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none focus:border-[var(--accent-primary)] transition-all font-black text-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button onClick={handleDeposit} className="py-4 gaming-gradient text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Plus size={16} />
                    {isRtl ? 'إيداع' : 'Deposit'}
                  </button>
                  <button onClick={handleWithdraw} className="py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:border-red-500 hover:text-red-500">
                    <Minus size={16} />
                    {isRtl ? 'سحب' : 'Withdraw'}
                  </button>
                </div>
              </div>

              {/* Transaction History */}
              <div className="flex-grow flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <History size={18} className="text-[var(--accent-primary)]" />
                    {isRtl ? 'سجل العمليات' : 'TRANSACTION HISTORY'}
                  </h4>
                </div>
                
                <div className="flex-grow overflow-y-auto space-y-3 no-scrollbar pb-10">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-2xl group hover:border-[var(--accent-primary)] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                             tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {tx.type === 'deposit' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div>
                            <div className="text-xs font-black uppercase italic tracking-tighter">{tx.description}</div>
                            <div className="text-[10px] font-bold text-[var(--text-secondary)]">{tx.createdAt.toLocaleDateString()} • {tx.createdAt.toLocaleTimeString()}</div>
                          </div>
                        </div>
                        <div className={`text-sm font-black ${
                          tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                      <History size={64} strokeWidth={1} />
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest">{isRtl ? 'لا توجد عمليات' : 'NO TRANSACTIONS'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-[var(--border-color)]">
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 flex items-center justify-center gap-3 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                >
                  <LogOut size={16} />
                  {isRtl ? 'تسجيل الخروج' : 'LOGOUT'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[120] modal-overlay"
            />
            <motion.div 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              className={`fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} w-full max-w-sm bg-[var(--bg-primary)] z-[130] p-8 flex flex-col`}
            >
              <div className="flex items-center justify-between mb-16">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gaming-gradient rounded-xl flex items-center justify-center">
                      <Gamepad2 className="text-white" size={24} />
                    </div>
                    <span className="text-xl font-black uppercase italic tracking-tighter">{t.appName}</span>
                 </div>
                 <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-[var(--bg-secondary)] rounded-2xl">
                   <X size={24} />
                 </button>
              </div>
              
              <div className="flex flex-col gap-8">
                {[
                  { label: t.home, action: () => { window.scrollTo({top: 0}); setIsMenuOpen(false); } },
                  { label: t.shop, action: () => { scrollToStore(); setIsMenuOpen(false); } },
                  { label: t.categories, action: () => { scrollToStore(); setIsMenuOpen(false); } },
                  { label: t.support, action: () => { setIsMenuOpen(false); } },
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={item.action}
                    className="text-4xl font-black uppercase italic tracking-tighter hover:text-[var(--accent-primary)] transition-colors text-right"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              
              <div className="mt-auto flex flex-col gap-4">
                 <button onClick={() => { setAuthMode('login'); setIsMenuOpen(false); }} className="w-full py-5 text-xl font-black uppercase italic border border-[var(--border-color)] rounded-2xl">{t.login}</button>
                 <button onClick={() => { setAuthMode('register'); setIsMenuOpen(false); }} className="w-full py-5 gaming-gradient text-white rounded-2xl text-xl font-black uppercase italic shadow-xl shadow-emerald-500/20">{t.register}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
