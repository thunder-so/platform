import type { Product, ProductMetadata, Price, Subscription } from '~~/server/db/schema';

export const usePolar = () => {
  const supabase = useSupabaseClient();
  const products = useState<Product[]>('products', () => []);
  const isLoading = useState('products.loading', () => false);

  const fetchProducts = async () => {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rawProducts = data as any[];
      products.value = rawProducts
        .map(p => ({
          ...p,
          created_at: new Date(p.created_at),
          updated_at: p.updated_at ? new Date(p.updated_at) : null,
          metadata: JSON.parse(JSON.stringify(p.metadata)),
        }))
        .sort((a, b) => {
          const aOrder = parseInt((a.metadata as any)?.metadata?.order || '999');
          const bOrder = parseInt((b.metadata as any)?.metadata?.order || '999');
          return aOrder - bOrder;
        }) as Product[];
    } catch (e) {
      console.error('Error fetching plans:', e);
    } finally {
      isLoading.value = false;
    }
  };

  // Polar pricing helpers
  const getPrimaryPrice = (meta?: ProductMetadata, preferType: 'recurring' | 'one_time' | 'any' = 'any'): Price | undefined => {
    let prices: any[] | undefined = (meta as any)?.prices ?? ((meta as any)?.price ? [(meta as any).price] : undefined);
    if (!prices) {
      if ((meta as any)?.product_price) prices = [(meta as any).product_price];
      else if ((meta as any)?.product?.product_price) prices = [(meta as any).product.product_price];
      else if (Array.isArray((meta as any)?.product?.prices)) prices = (meta as any).product.prices;
    }

    if (!prices || prices.length === 0) return undefined;
    if (preferType === 'recurring') return prices.find((p: Price) => p.type === 'recurring') ?? prices[0];
    if (preferType === 'one_time') return prices.find((p: Price) => p.type === 'one_time') ?? prices[0];
    if (meta?.is_recurring) return prices.find((p: Price) => p.type === 'recurring') ?? prices[0];
    return prices.find((p: Price) => p.type === 'one_time') ?? prices[0];
  };

  const resolveMeta = (plan?: Product | ProductMetadata | any) => {
    if (!plan) return undefined;
    const pAny = plan as any;
    if (pAny.metadata && typeof pAny.metadata === 'object' && pAny.metadata !== null && Object.keys(pAny.metadata).length > 0) return pAny.metadata;
    return pAny;
  };

  const priceDisplay = (plan: Product | ProductMetadata | undefined) => {
    const meta = resolveMeta(plan);
    const p = getPrimaryPrice(meta);
    if (!p) return { label: '—', amount: undefined, currency: undefined };
    return {
      label: `${((p as any).price_amount ?? 0) / 100} ${(((p as any).price_currency) ?? 'usd').toUpperCase()}${(p as any).type === 'recurring' ? ` / ${(p as any).recurring_interval}` : ''}`,
      amount: (p as any).price_amount,
      currency: (p as any).price_currency,
    };
  };

  const isTrialing = (subscription?: Subscription | null) => {
    return subscription?.status === 'trialing';
  };

  return {
    products: readonly(products),
    isLoading: readonly(isLoading),
    fetchProducts,
    getPrimaryPrice,
    priceDisplay,
    isTrialing,
  };
};