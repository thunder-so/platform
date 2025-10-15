import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }, // Edge functions are stateless
})

console.log('🚀 Polar Webhook Edge Function initialized!')

// Helper function to sync customer data
async function syncCustomer(customerData: any, metadata: any) {
  const userId = metadata?.user_id
  const organizationId = metadata?.organization_id
  const polarCustomerId = customerData.id

  if (!userId || !organizationId) {
    console.error('Webhook Error: user_id or organization_id not found in metadata for customer.', { polarCustomerId })
    // Acknowledge the event to prevent retries, but log the issue.
    return
  }

  const { error } = await supabase
    .from('customers')
    .upsert({
      user_id: userId,
      organization_id: organizationId,
      polar_customer_id: polarCustomerId,
    })

  if (error) {
    // Log the error but don't throw, allowing the main process to continue if possible
    console.error('❌ Failed to sync customer:', error)
  } else {
    console.log(`✅ Successfully synced customer: ${polarCustomerId} for org ${organizationId}`)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 401 })
  }

  const body = await req.text()
  const payload = JSON.parse(body)
  const eventType = payload.type
  console.log(`Received event type: ${eventType}`)

  try {
    if (eventType === 'product.created' || eventType === 'product.updated') {
      const productData = payload.data

      const { error } = await supabase
        .from('products')
        .upsert({
          id: productData.id,
          active: !productData.is_archived,
          name: productData.name,
          description: productData.description,
          metadata: productData,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('❌ Failed to sync product:', error)
        // Still return OK to prevent Polar retries for this single failure
        return new Response('OK', { status: 200 })
      }

      console.log(`✅ Successfully synced product: ${productData.id}`)
    } else if (eventType === 'customer.created' || eventType === 'customer.updated') {
      const customerData = payload.data
      // The customer's metadata should contain our internal IDs
      await syncCustomer(customerData, customerData.metadata)
      console.log(`✅ Successfully synced customer: ${customerData.id}`)
      
    } else if (['subscription.created', 'subscription.active', 'subscription.updated', 'subscription.cancelled', 'subscription.uncanceled', 'subscription.revoked'].includes(eventType)) {
      const subData = payload.data

      // Sync the customer record first using the subscription's metadata
      // This ensures the customer record is up-to-date
      await syncCustomer(subData.customer, subData.metadata)

      const userId = subData.metadata?.user_id
      const organizationId = subData.metadata?.organization_id

      // The check is now inside syncCustomer, but we repeat it here for the subscription itself.
      if (!userId || !organizationId) {
        console.error('Webhook Error: user_id and organization_id not found in subscription metadata.', { subscriptionId: subData.id })
        return new Response('OK', { status: 200 })
      }

      // Upsert subscription
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          id: subData.id,
          user_id: userId,
          organization_id: organizationId,
          polar_customer_id: subData.customer.id,
          status: subData.status,
          product_id: subData.product?.id,
          cancel_at_period_end: subData.cancel_at_period_end,
          current_period_start: new Date(subData.current_period_start).toISOString(),
          current_period_end: new Date(subData.current_period_end).toISOString(),
          ended_at: subData.ended_at ? new Date(subData.ended_at).toISOString() : null,
          cancel_at: subData.cancel_at ? new Date(subData.cancel_at).toISOString() : null,
          canceled_at: subData.canceled_at ? new Date(subData.canceled_at).toISOString() : null,
          metadata: subData,
        })

      if (error) {
        console.error('❌ Failed to sync subscription:', error)
        return new Response('OK', { status: 200 })
      }

      console.log(`✅ Successfully synced subscription: ${subData.id}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('❌ Failed to process webhook:', error)
    return new Response('Webhook processing error', { status: 500 })
  }
})
