import type { Product } from '~~/server/db/schema';

export const usePlans = () => {
  const supabase = useSupabaseClient();
  const plans = useState<Product[]>('plans', () => []);
  const isLoading = useState('plans.loading', () => false);

  const fetchPlans = async () => {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      plans.value = data as Product[];
    } catch (e) {
      console.error('Error fetching plans:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const isSeatBased = (plan: Product) => {
    return plan.metadata?.prices?.[0]?.amount_type === 'seat_based';
  };

  const getSeatPrice = (plan: Product) => {
    const price = plan.metadata?.prices?.[0];
    return price?.amount_type === 'seat_based' ? (price as any).price_per_seat || 0 : 0;
  };

  return {
    plans: readonly(plans),
    isLoading: readonly(isLoading),
    fetchPlans,
    isSeatBased,
    getSeatPrice,
  };
};
