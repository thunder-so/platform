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

      // Add a synthetic free plan
      const now = new Date().toISOString();
      const freePlan: Product = {
        id: 'free',
        name: 'Hobby',
        description: 'For personal projects and vibe coders.',
        metadata: {
          id: 'prod_free',
          name: 'Hobby',
          medias: [],
          prices: [
            {
              id: 'price_free',
              type: 'recurring',
              created_at: now,
              product_id: 'prod_free',
              amount_type: 'fixed',
              price_amount: 0,
              price_currency: 'USD',
              recurring_interval: 'month',
              modified_at: now,
            }
          ],
          benefits: [],
          metadata: {
            max_providers: 1,
            max_members: 1,
          },
          created_at: now,
          description: '$0 per month.',
          is_archived: false,
          modified_at: now,
          is_recurring: true,
          organization_id: '',
          recurring_interval: 'month',
          attached_custom_fields: [],
        },
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

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
