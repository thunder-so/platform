import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseSecretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseSecretKey);

Deno.serve(async (req) => {
  const { email } = await req.json();

  try {
    const { data: user } = await supabase
      .from('users')
      .select('full_name')
      .eq('email', email)
      .single();

    const fullName = user?.full_name?.trim() || '';

    let firstName: string;
    let lastName: string = '';

    if (fullName) {
      // Normal case: split full_name
      const parts = fullName.split(/\s+/);        // handles multiple spaces
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else {
      // No full_name → use email handle as first_name
      firstName = email.split('@')[0] || '';
      lastName = '';
    }

    // Optional: Capitalize first letter of first_name (recommended for nicer display)
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Failed to add contact to Resend:', error);
    return new Response('Error', { status: 500 });
  }
});