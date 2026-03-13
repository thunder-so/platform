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
          metadata: JSON.parse(JSON.stringify(p.metadata)), // Deep clone to remove readonly
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

  const seatUsage = useState('seat-usage', () => ({ used: 0, total: 1, isSeatBased: false }));

  const fetchSeatUsage = async (orgId: string) => {
    // Reset to avoid showing stale data from another org
    seatUsage.value = { used: 0, total: 1, isSeatBased: false };
    const { $client } = useNuxtApp();
    try {
      const usage = await $client.team.getSeatUsage.query({ organizationId: orgId });
      seatUsage.value = usage;
    } catch (e) {
      console.error('Error fetching seat usage:', e);
    }
  };

  const limitReached = computed(() => seatUsage.value.used >= seatUsage.value.total);

  // Polar pricing helpers
  const getPrimaryPrice = (meta?: ProductMetadata, preferType: 'recurring' | 'one_time' | 'any' = 'any'): Price | undefined => {
    // Support multiple metadata shapes: ProductMetadata.prices, .price, order metadata.product_price,
    // and product.prices/product.product_price that sometimes appear in order objects.
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

  const isFree = (plan: Product | ProductMetadata | undefined) => {
    const meta = resolveMeta(plan);
    const p = getPrimaryPrice(meta);
    return !!p && (p as any).amount_type === 'free';
  };

  const isSeatBased = (plan: Product | ProductMetadata | undefined) => {
    const meta = resolveMeta(plan);
    const p = getPrimaryPrice(meta);
    return !!p && (p as any).amount_type === 'seat_based';
  };

  const isOneTime = (plan: Product | ProductMetadata | undefined) => {
    const meta = resolveMeta(plan);
    const p = getPrimaryPrice(meta);
    return !!p && (p as any).type === 'one_time';
  };

  const getSeatPrice = (plan: Product | ProductMetadata | undefined) => {
    const meta = resolveMeta(plan);
    const p = getPrimaryPrice(meta);
    if (!p) return 0;
    if ((p as any).amount_type !== 'seat_based') return 0;
    return (p as any).price_per_seat ?? (p as any).seat_tiers?.tiers?.[0]?.price_per_seat ?? 0;
  };

  const priceDisplay = (plan: Product | ProductMetadata | undefined) => {
    const meta = resolveMeta(plan);
    const p = getPrimaryPrice(meta);
    if (!p) return { label: '—', amount: undefined, currency: undefined };
    const amtType = (p as any).amount_type;
    if (amtType === 'free') return { label: 'Free', amount: 0, currency: undefined };
    if (amtType === 'seat_based') {
      const perSeat = (p as any).price_per_seat ?? (p as any).seat_tiers?.tiers?.[0]?.price_per_seat ?? 0;
      const currency = (p as any).price_currency ?? 'usd';
      return { label: `${perSeat / 100} ${currency.toUpperCase()}`, amount: perSeat, currency };
    }

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
    seatUsage: readonly(seatUsage),
    fetchSeatUsage,
    limitReached,
    isSeatBased,
    getSeatPrice,
    getPrimaryPrice,
    isFree,
    isOneTime,
    priceDisplay,
    isTrialing,
  };
};