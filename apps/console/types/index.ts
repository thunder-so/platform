export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  productId: string | null;
}
