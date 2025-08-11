import { useSupabaseClient } from '#imports';
import type { Product } from '~/server/db/schema';

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

      // Add a synthetic free plan if needed
      const freePlan: Product = {
        id: 'free',
        name: 'Hobby',
        description: 'For personal projects and vibe coders.',
        metadata: {
          max_providers: 1,
          max_members: 1,
          prices: [
            {
              id: 'price_free',
              type: 'recurring',
              product_id: 'prod_free',
              amount_type: 'fixed',
              price_amount: 0,
              price_currency: 'USD',
              recurring_interval: 'month',
            }
          ],
        },
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Product;

      plans.value = [freePlan, ...(data as Product[])];
    } catch (e) {
      console.error('Error fetching plans:', e);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    plans: readonly(plans),
    isLoading: readonly(isLoading),
    fetchPlans,
  };
};
