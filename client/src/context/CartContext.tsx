import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { PriceQuote } from '../types';

export interface SelectedPhoto {
  id: string;
  filename: string;
  previewUrl: string;
  thumbnailUrl: string;
  eventName?: string;
}

interface CartContextType {
  selectedPhotos: SelectedPhoto[];
  addPhoto: (photo: SelectedPhoto) => void;
  addPhotos: (photos: SelectedPhoto[]) => void;
  removePhoto: (photoId: string) => void;
  removePhotos: (photoIds: string[]) => void;
  togglePhoto: (photo: SelectedPhoto) => void;
  clearCart: () => void;
  isSelected: (photoId: string) => boolean;
  count: number;
  quote: PriceQuote | null;
  isLoadingQuote: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  tipCents: number;
  setTipCents: (cents: number) => void;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('oloboc_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [tipCents, setTipCents] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('oloboc_cart', JSON.stringify(selectedPhotos));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }

    if (selectedPhotos.length === 0) {
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    api
      .getQuote(
        selectedPhotos.map((p) => p.id),
        tipCents
      )
      .then((q) => setQuote(q))
      .catch((err) => console.error('Quote error:', err))
      .finally(() => setIsLoadingQuote(false));
  }, [selectedPhotos, tipCents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const addPhoto = (photo: SelectedPhoto) => {
    setSelectedPhotos((prev) => {
      if (prev.some((p) => p.id === photo.id)) return prev;
      showToast('Fotografía añadida a la selección');
      return [...prev, photo];
    });
  };

  const addPhotos = (photos: SelectedPhoto[]) => {
    setSelectedPhotos((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const toAdd = photos.filter((p) => !existingIds.has(p.id));
      if (toAdd.length === 0) return prev;
      showToast(`${toAdd.length} fotografías añadidas a la selección`);
      return [...prev, ...toAdd];
    });
  };

  const removePhoto = (photoId: string) => {
    setSelectedPhotos((prev) => prev.filter((p) => p.id !== photoId));
    showToast('Fotografía retirada');
  };

  const removePhotos = (photoIds: string[]) => {
    const idSet = new Set(photoIds);
    setSelectedPhotos((prev) => prev.filter((p) => !idSet.has(p.id)));
    showToast(`${photoIds.length} fotografías retiradas`);
  };

  const togglePhoto = (photo: SelectedPhoto) => {
    if (selectedPhotos.some((p) => p.id === photo.id)) {
      removePhoto(photo.id);
    } else {
      addPhoto(photo);
    }
  };

  const clearCart = () => {
    setSelectedPhotos([]);
    setTipCents(0);
  };

  const isSelected = (photoId: string) => selectedPhotos.some((p) => p.id === photoId);

  return (
    <CartContext.Provider
      value={{
        selectedPhotos,
        addPhoto,
        addPhotos,
        removePhoto,
        removePhotos,
        togglePhoto,
        clearCart,
        isSelected,
        count: selectedPhotos.length,
        quote,
        isLoadingQuote,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        tipCents,
        setTipCents,
        showToast
      }}
    >
      {children}
      {toastMessage && <div className="toast-msg">{toastMessage}</div>}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
