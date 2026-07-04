import { useState } from 'react';

export function CartPanel() {
  const [cartTotal, setCartTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  function addItem(price: number) {
    setCartTotal(cartTotal + price);
  }

  function removeItem(price: number) {
    setCartTotal(cartTotal - price);
  }

  function startLoad() {
    setIsLoading(true);
  }

  function finishLoad() {
    setIsLoading(false);
  }

  function showTotal() {
    return cartTotal;
  }

  function showSpinner() {
    return isLoading ? '...' : null;
  }

  return (
    <div>
      <span>{showTotal()}</span>
      {showSpinner()}
    </div>
  );
}
