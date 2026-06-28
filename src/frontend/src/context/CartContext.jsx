import { createContext, useState } from "react";
import api from "../config/api";

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = async (userId, token) => {
    if (!userId || !token) return;

    try {
      const { data } = await api.get(`/api/cart/count/user/${userId}`);
      setCartCount(data);
    } catch (err) {
      console.error("CartContext error:", err);
    }
  };

  const resetCartCount = () => setCartCount(0);


  return (
    <CartContext.Provider value={{ cartCount, setCartCount, refreshCartCount, resetCartCount }}>
      {children}
    </CartContext.Provider>
  );
};
