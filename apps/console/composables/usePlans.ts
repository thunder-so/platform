import { useSupabaseClient } from '#imports';

interface Price {
  id: string;
  type: string;
  created_at: string;
  product_id: string;
  amount_type: string;
  is_archived?: boolean;
  modified_at: string;
  price_amount: number;
  price_currency: string;
  recurring_interval: "month" | "year";
}

interface ProductMetadata {
  id: string;
  name: string;
  medias: readonly any[];
  prices: readonly Price[];
  benefits: readonly any[];
  metadata: Record<string, any>;
  created_at: string;
  description: string;
  is_archived: boolean;
  modified_at: string;
  is_recurring: boolean;
  organization_id: string;
  recurring_interval: "month" | "year";
  attached_custom_fields: readonly any[];
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  metadata: ProductMetadata
}

export const usePlans = () => {
  const supabase = useSupabaseClient();
  const plans = useState<Plan[]>('plans', () => []);
  const isLoading = useState('plans.loading', () => false);

  const fetchPlans = async () => {
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, metadata')
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const freePlan: Plan = {
        id: 'free',
        name: 'Hobby',
        description: 'For personal projects and vibe coders.',
        metadata: {
          id: 'prod_free',
          name: 'Free',
          prices: [
            {
              id: 'price_free',
              type: 'recurring',
              product_id: 'prod_free',
              amount_type: 'fixed',
              price_amount: 0,
              price_currency: 'USD',
            }
          ],
        } as any,
      };

      plans.value = [freePlan, ...(data as Plan[])];
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
