import { useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info';
}

let toastListeners: Array<(toasts: ToastMessage[]) => void> = [];
let toastsList: ToastMessage[] = [];

export const useToasts = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>(toastsList);
  return { toasts, setToasts };
};

export const showPrToast = (message: string) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = {
    id,
    message,
    type: 'success',
  };
  toastsList = [...toastsList, newToast];
  toastListeners.forEach(listener => listener(toastsList));

  // Automatically remove toast after 5 seconds
  setTimeout(() => {
    toastsList = toastsList.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(toastsList));
  }, 5000);
};

export const registerToastListener = (listener: (toasts: ToastMessage[]) => void) => {
  toastListeners.push(listener);
  listener(toastsList);
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
};
