import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  fullName: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface SpecItem {
  label: string;
  val: string;
}

export interface ConfiguratorCheckPayload {
  processorId?: string;
  motherboardId?: string;
  ramId?: string;
  gpuId?: string;
  coolerId?: string;
  storageId?: string;
  psuId?: string;
  caseId?: string;
}

export interface ShippingAddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  fullName?: string;
  phone?: string;
}

export interface OrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddressInput;
  shippingMethod: 'standard' | 'express' | 'priority';
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'cod';
  items: { productId: string; quantity: number }[];
}
